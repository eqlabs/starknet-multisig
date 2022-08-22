import { expect } from "chai";
import { ethers } from "ethers";
import { starknet } from "hardhat";
import {
  StarknetContract,
  StarknetContractFactory,
  Account,
  TransactionReceipt,
} from "hardhat/types/runtime";
import { number } from "starknet";
import { getSelectorFromName } from "starknet/dist/utils/hash";
import {
  defaultPayload,
  assertErrorMsg,
  assertGenericRevert,
  assertEvent,
  IEventDataEntry,
} from "./utils";
import fs from "fs";

const dumpFile = "test/unittest-dump.dmp";

describe("Multisig with single signer", function () {
  this.timeout(300_000);

  let contractFactory: StarknetContractFactory;
  let targetContract: StarknetContract;
  let multisig: StarknetContract;

  let account: Account;
  let nonSigner: Account;
  let accountAddress: string;

  before(async function () {
    starknet.devnet.restart();

    account = await starknet.deployAccount("OpenZeppelin");
    nonSigner = await starknet.deployAccount("OpenZeppelin");

    accountAddress = account.starknetContract.address;

    const multisigFactory = await starknet.getContractFactory("Multisig");
    multisig = await multisigFactory.deploy({
      signers: [number.toBN(accountAddress)],
      threshold: 1,
    });

    contractFactory = await starknet.getContractFactory("Target");
    targetContract = await contractFactory.deploy();

    console.log("Deployed target contract at", targetContract.address);
    console.log(
      "Deployed account at address:",
      account.starknetContract.address
    );

    await starknet.devnet.dump(dumpFile);
  });

  beforeEach(async function () {
    await starknet.devnet.load(dumpFile);
  });

  after(async function () {
    fs.unlink(dumpFile, () => {});
  });

  describe(" - deployment - ", function () {
    it("works", async function () {
      const multisigFactory = await starknet.getContractFactory("Multisig");
      const toBeAddedSigner = nonSigner;

      const newMultisig = await multisigFactory.deploy({
        signers: [
          number.toBN(account.starknetContract.address),
          number.toBN(toBeAddedSigner.starknetContract.address),
        ],
        threshold: 1,
      });

      const signers = await newMultisig.call("get_signers");
      const signersLength = await newMultisig.call("get_signers_len");
      const isSignerValid1 = await newMultisig.call("is_signer", {
        address: number.toBN(account.starknetContract.address),
      });
      const isSignerValid2 = await newMultisig.call("is_signer", {
        address: number.toBN(toBeAddedSigner.starknetContract.address),
      });
      const isSignerInvalid = await newMultisig.call("is_signer", {
        address: number.toBN(123),
      });
      const threshold = await newMultisig.call("get_threshold");

      expect(signers.signers_len).to.equal(2n);
      expect(signers.signers[0].toString()).to.equal(
        number.toBN(account.starknetContract.address).toString()
      );
      expect(signers.signers[1].toString()).to.equal(
        number.toBN(toBeAddedSigner.starknetContract.address).toString()
      );
      expect(signersLength.signers_len).to.equal(2n);
      expect(isSignerValid1.res).to.equal(1n);
      expect(isSignerValid2.res).to.equal(1n);
      expect(isSignerInvalid.res).to.equal(0n);
      expect(threshold.threshold).to.equal(1n);
    });

    it("deploy multisig with invalid threshold fails", async function () {
      const multisigFactory = await starknet.getContractFactory("Multisig");
      const toBeAddedSigner = nonSigner;

      try {
        await multisigFactory.deploy({
          signers: [
            number.toBN(account.starknetContract.address),
            number.toBN(toBeAddedSigner.starknetContract.address),
          ],
          threshold: 3,
        });
        expect.fail("Should have failed");
      } catch (err: any) {
        assertErrorMsg(err.message, "Invalid threshold");
      }
    });

    it("deploy multisig with empty signers fails", async function () {
      const multisigFactory = await starknet.getContractFactory("Multisig");

      try {
        await multisigFactory.deploy({
          signers: [],
          threshold: 4,
        });
        expect.fail("Should have failed");
      } catch (err: any) {
        assertErrorMsg(err.message, "Invalid threshold");
      }
    });
  });

  describe(" - submit - ", function () {
    it("works", async function () {
      const selector = number.toBN(getSelectorFromName("set_balance"));
      const target = number.toBN(targetContract.address);
      const payload = {
        to: target,
        function_selector: selector,
        calldata: [5],
        nonce: 0,
      };

      await account.invoke(multisig, "submit_transaction", payload);

      const tranLen = await multisig.call("get_transactions_len");
      const res = await multisig.call("get_transaction", {
        nonce: 0,
      });

      expect(tranLen.res).to.equal(1n);
      expect(res.tx.to.toString()).to.equal(target.toString());
      expect(res.tx.function_selector.toString()).to.equal(selector.toString());
      expect(res.tx.calldata_len).to.equal(1n);
      expect(res.tx.executed).to.equal(0n);
      expect(res.tx.confirmations).to.equal(0n);
      expect(res.tx_calldata_len).to.equal(1n);
      expect(res.tx_calldata[0]).to.equal(5n);
    });

    it("submit for too big transaction nonce fails", async function () {
      const payload = defaultPayload(targetContract.address, 6, 5);

      try {
        await account.invoke(multisig, "submit_transaction", payload);
        expect.fail("Should have failed");
      } catch (err: any) {
        assertErrorMsg(err.message, "Invalid nonce");
      }
    });

    it("submit for too small transaction nonce fails", async function () {
      const payload = defaultPayload(targetContract.address, 6, 0);
      await account.invoke(multisig, "submit_transaction", payload);

      try {
        await account.invoke(multisig, "submit_transaction", payload);
        expect.fail("Should have failed");
      } catch (err: any) {
        assertErrorMsg(err.message, "Invalid nonce");
      }
    });

    it("non-signer can't submit a transaction", async function () {
      const payload = defaultPayload(targetContract.address, 10, 0);

      try {
        await nonSigner.invoke(multisig, "submit_transaction", payload);
        expect.fail("Should have failed");
      } catch (err: any) {
        assertErrorMsg(err.message, "Invalid signer");
      }
    });
  });

  describe("- confirmation - ", function () {
    it("works", async function () {
      const payload = defaultPayload(targetContract.address, 15, 0);

      await account.invoke(multisig, "submit_transaction", payload);

      await account.invoke(multisig, "confirm_transaction", {
        nonce: 0,
      });

      const isConfirmed = await multisig.call("is_confirmed", {
        nonce: 0,
        signer: number.toBN(account.starknetContract.address),
      });
      expect(isConfirmed.res).to.equal(1n);
    });

    it("non-signer confirming a transaction fails", async function () {
      const payload = defaultPayload(targetContract.address, 15, 0);

      await account.invoke(multisig, "submit_transaction", payload);
      try {
        await nonSigner.invoke(multisig, "confirm_transaction", {
          nonce: 0,
        });
        expect.fail("Should have failed");
      } catch (err: any) {
        assertErrorMsg(err.message, "Invalid signer");
      }
    });

    it("confirming a non-existing transaction fails", async function () {
      try {
        await account.invoke(multisig, "confirm_transaction", {
          nonce: 500,
        });
        expect.fail("Should have failed");
      } catch (err: any) {
        assertErrorMsg(err.message, "Transaction does not exist");
      }
    });

    it("confirming an executed transaction fails", async function () {
      const payload = defaultPayload(targetContract.address, 16, 0);

      await account.invoke(multisig, "submit_transaction", payload);
      await account.invoke(multisig, "confirm_transaction", {
        nonce: 0,
      });
      await account.invoke(multisig, "execute_transaction", {
        nonce: 0,
      });

      try {
        await account.invoke(multisig, "confirm_transaction", {
          nonce: 0,
        });
        expect.fail("Should have failed");
      } catch (err: any) {
        assertErrorMsg(err.message, "Transaction already executed");
      }
    });

    it("reconfirming a transaction fails", async function () {
      const payload = defaultPayload(targetContract.address, 10, 0);

      await account.invoke(multisig, "submit_transaction", payload);
      await account.invoke(multisig, "confirm_transaction", {
        nonce: 0,
      });

      try {
        await account.invoke(multisig, "confirm_transaction", {
          nonce: 0,
        });
        expect.fail("Should have failed");
      } catch (err: any) {
        assertErrorMsg(err.message, "Transaction already confirmed");
      }
    });
  });

  describe("- revocation - ", function () {
    it("works", async function () {
      const payload = defaultPayload(targetContract.address, 10, 0);

      await account.invoke(multisig, "submit_transaction", payload);
      await account.invoke(multisig, "confirm_transaction", {
        nonce: 0,
      });

      await account.invoke(multisig, "revoke_confirmation", {
        nonce: 0,
      });

      const isConfirmed = await multisig.call("is_confirmed", {
        nonce: 0,
        signer: number.toBN(account.starknetContract.address),
      });
      expect(isConfirmed.res).to.equal(0n);
    });

    it("can revoke any transaction confirmation", async function () {
      const payload = defaultPayload(targetContract.address, 10, 0);

      await account.invoke(multisig, "submit_transaction", payload);
      payload.nonce = 1;
      await account.invoke(multisig, "submit_transaction", payload);
      payload.nonce = 2;
      await account.invoke(multisig, "submit_transaction", payload);
      await account.invoke(multisig, "confirm_transaction", {
        nonce: 0,
      });
      await account.invoke(multisig, "confirm_transaction", {
        nonce: 1,
      });

      await account.invoke(multisig, "revoke_confirmation", {
        nonce: 0,
      });

      const isConfirmed1 = await multisig.call("is_confirmed", {
        nonce: 0,
        signer: number.toBN(account.starknetContract.address),
      });
      const isConfirmed2 = await multisig.call("is_confirmed", {
        nonce: 1,
        signer: number.toBN(account.starknetContract.address),
      });
      const isConfirmed3 = await multisig.call("is_confirmed", {
        nonce: 2,
        signer: number.toBN(account.starknetContract.address),
      });

      expect(isConfirmed1.res).to.equal(0n);
      expect(isConfirmed2.res).to.equal(1n);
      expect(isConfirmed3.res).to.equal(0n);
    });

    it("non-signer fails to revoke a confirmation", async function () {
      const payload = defaultPayload(targetContract.address, 10, 0);

      await account.invoke(multisig, "submit_transaction", payload);
      await account.invoke(multisig, "confirm_transaction", {
        nonce: 0,
      });

      try {
        await nonSigner.invoke(multisig, "revoke_confirmation", {
          nonce: 0,
        });
        expect.fail("Should have failed");
      } catch (err: any) {
        assertErrorMsg(err.message, "Invalid signer");
      }
    });

    it("revoking a confirmation for a non-existing transaction fails", async function () {
      try {
        await account.invoke(multisig, "revoke_confirmation", {
          nonce: 5000,
        });
        expect.fail("Should have failed");
      } catch (err: any) {
        assertErrorMsg(err.message, "Transaction does not exist");
      }
    });

    it("revoking a confirmation for an executed transaction fails", async function () {
      const payload = defaultPayload(targetContract.address, 10, 0);

      await account.invoke(multisig, "submit_transaction", payload);
      await account.invoke(multisig, "confirm_transaction", {
        nonce: 0,
      });

      await account.invoke(multisig, "execute_transaction", {
        nonce: 0,
      });

      try {
        await account.invoke(multisig, "revoke_confirmation", {
          nonce: 0,
        });
        expect.fail("Should have failed");
      } catch (err: any) {
        assertErrorMsg(err.message, "Transaction already executed");
      }
    });

    it("re-revoking a transaction confirmation fails", async function () {
      const payload = defaultPayload(targetContract.address, 10, 0);

      await account.invoke(multisig, "submit_transaction", payload);
      await account.invoke(multisig, "confirm_transaction", {
        nonce: 0,
      });

      await account.invoke(multisig, "revoke_confirmation", {
        nonce: 0,
      });

      try {
        await account.invoke(multisig, "revoke_confirmation", {
          nonce: 0,
        });
        expect.fail("Should have failed");
      } catch (err: any) {
        assertErrorMsg(err.message, "Transaction not confirmed");
      }
    });
  });

  describe("- execution - ", function () {
    it("works", async function () {
      const payload = defaultPayload(targetContract.address, 987, 0);

      await account.invoke(multisig, "submit_transaction", payload);
      await account.invoke(multisig, "confirm_transaction", {
        nonce: 0,
      });

      await account.invoke(multisig, "execute_transaction", {
        nonce: 0,
      });

      const isExecuted = await multisig.call("is_executed", { nonce: 0 });
      const targetValue = await targetContract.call("get_balance");

      expect(isExecuted.res).to.equal(1n);
      expect(targetValue.res).to.equal(987n);
    });

    it("also non-signer can execute", async function () {
      const payload = defaultPayload(targetContract.address, 10, 0);

      await account.invoke(multisig, "submit_transaction", payload);
      await account.invoke(multisig, "confirm_transaction", {
        nonce: 0,
      });

      await nonSigner.invoke(multisig, "execute_transaction", {
        nonce: 0,
      });

      const isExecuted = await multisig.call("is_executed", { nonce: 0 });
      expect(isExecuted.res).to.equal(1n);
    });

    it("transaction execute works for subsequent transactions", async function () {
      let payload = defaultPayload(targetContract.address, 7, 0);
      await account.invoke(multisig, "submit_transaction", payload);

      await account.invoke(multisig, "confirm_transaction", {
        nonce: 0,
      });
      await account.invoke(multisig, "execute_transaction", {
        nonce: 0,
      });

      // submit another transaction with the same multisig
      payload = defaultPayload(targetContract.address, 8, 1);

      await account.invoke(multisig, "submit_transaction", payload);
      await account.invoke(multisig, "confirm_transaction", {
        nonce: 1,
      });
      await account.invoke(multisig, "execute_transaction", {
        nonce: 1,
      });

      const bal = await targetContract.call("get_balance");
      expect(bal.res).to.equal(BigInt(8));
    });

    it("transactions can be confirmed and executed in any order", async function () {
      let payload = defaultPayload(targetContract.address, 17, 0);
      await account.invoke(multisig, "submit_transaction", payload);

      payload = defaultPayload(targetContract.address, 18, 1);
      await account.invoke(multisig, "submit_transaction", payload);

      payload = defaultPayload(targetContract.address, 19, 2);
      await account.invoke(multisig, "submit_transaction", payload);

      // confirm in any order (skip one)
      await account.invoke(multisig, "confirm_transaction", {
        nonce: 2,
      });
      await account.invoke(multisig, "confirm_transaction", {
        nonce: 0,
      });

      await account.invoke(multisig, "execute_transaction", {
        nonce: 2,
      });
      const bal3 = await targetContract.call("get_balance");

      // confirm also the one unconfirmed
      await account.invoke(multisig, "confirm_transaction", {
        nonce: 1,
      });

      await account.invoke(multisig, "execute_transaction", {
        nonce: 0,
      });
      const bal1 = await targetContract.call("get_balance");

      await account.invoke(multisig, "execute_transaction", {
        nonce: 1,
      });
      const bal2 = await targetContract.call("get_balance");

      expect(bal1.res).to.equal(BigInt(17));
      expect(bal2.res).to.equal(BigInt(18));
      expect(bal3.res).to.equal(BigInt(19));
    });

    it("transaction with complex arguments work", async function () {
      const selector = number.toBN(getSelectorFromName("complex_inputs"));
      const target = number.toBN(targetContract.address);
      const simpleArray = [1, 2, 3];
      const structArrayData = [
        { first: 4, second: 5 },
        { first: 6, second: 7 },
      ];
      let empty: any[] = [];
      var structArray = empty.concat(
        ...structArrayData.map((i) => Object.values(i))
      );

      // Calldata has 1) a simple number array 2) an array with struct elements containing numbers
      const calldata = [
        simpleArray.length,
        ...simpleArray,
        structArrayData.length,
        ...structArray,
      ];
      const payload = {
        to: target,
        function_selector: selector,
        calldata: calldata,
        nonce: 0,
      };

      await account.invoke(multisig, "submit_transaction", payload);
      await account.invoke(multisig, "confirm_transaction", {
        nonce: 0,
      });
      await account.invoke(multisig, "execute_transaction", {
        nonce: 0,
      });

      const bal = await targetContract.call("getArraySum");
      const sum = simpleArray
        .concat(Object.values(structArrayData[0]))
        .concat(Object.values(structArrayData[1]))
        .reduce((a, b) => a + b, 0);

      expect(bal.res).to.equal(BigInt(sum));
    });

    it("executing a failing transaction fails", async function () {
      const selector = number.toBN(getSelectorFromName("revertFunc"));
      const target = number.toBN(targetContract.address);

      const payload = {
        to: target,
        function_selector: selector,
        calldata: [],
        nonce: 0,
      };
      await account.invoke(multisig, "submit_transaction", payload);
      await account.invoke(multisig, "confirm_transaction", {
        nonce: 0,
      });

      try {
        await account.invoke(multisig, "execute_transaction", {
          nonce: 0,
        });
        expect.fail("Should have failed");
      } catch (err: any) {
        assertGenericRevert(err.message);
      }
    });

    it("executing a transaction to a non-existing function fails", async function () {
      const selector = number.toBN(getSelectorFromName("nonExisting"));
      const target = number.toBN(targetContract.address);
      const payload = {
        to: target,
        function_selector: selector,
        calldata: [],
        nonce: 0,
      };
      await account.invoke(multisig, "submit_transaction", payload);
      await account.invoke(multisig, "confirm_transaction", {
        nonce: 0,
      });

      try {
        await account.invoke(multisig, "execute_transaction", {
          nonce: 0,
        });
        expect.fail("Should have failed");
      } catch (err: any) {
        assertGenericRevert(err.message);
      }
    });

    it("executing a non-existing transaction fails", async function () {
      try {
        await account.invoke(multisig, "execute_transaction", {
          nonce: 600,
        });
        expect.fail("Should have failed");
      } catch (err: any) {
        assertErrorMsg(err.message, "Transaction does not exist");
      }
    });

    it("re-executing a transaction fails", async function () {
      const payload = defaultPayload(targetContract.address, 10, 0);

      await account.invoke(multisig, "submit_transaction", payload);
      await account.invoke(multisig, "confirm_transaction", {
        nonce: 0,
      });

      await account.invoke(multisig, "execute_transaction", {
        nonce: 0,
      });

      try {
        await account.invoke(multisig, "execute_transaction", {
          nonce: 0,
        });
        expect.fail("Should have failed");
      } catch (err: any) {
        assertErrorMsg(err.message, "Transaction already executed");
      }
    });

    it("executing a transaction without sufficient confirmations fails", async function () {
      const payload = defaultPayload(targetContract.address, 9, 0);

      await account.invoke(multisig, "submit_transaction", payload);
      try {
        await account.invoke(multisig, "execute_transaction", {
          nonce: 0,
        });
        expect.fail("Should have failed");
      } catch (err: any) {
        assertErrorMsg(err.message, "More confirmations required");
      }
    });
  });

  describe("- event emission - ", function () {
    it("correct events are emitted for normal flow", async function () {
      const payload = defaultPayload(targetContract.address, 6, 0);
      let txHash = await account.invoke(
        multisig,
        "submit_transaction",
        payload
      );
      const receiptSubmit = await starknet.getTransactionReceipt(txHash);

      const eventDataSubmit: IEventDataEntry[] = [
        { data: accountAddress, isAddress: true },
        { data: ethers.utils.hexValue(0) },
        { data: targetContract.address, isAddress: true },
      ];

      txHash = await account.invoke(multisig, "confirm_transaction", {
        nonce: 0,
      });
      const receiptConfirm = await starknet.getTransactionReceipt(txHash);
      const eventDataConfirm: IEventDataEntry[] = [
        { data: accountAddress, isAddress: true },
        { data: ethers.utils.hexValue(0) },
      ];

      txHash = await account.invoke(multisig, "execute_transaction", {
        nonce: 0,
      });
      const receiptExecute = await starknet.getTransactionReceipt(txHash);
      const eventDataExecute: IEventDataEntry[] = [
        { data: accountAddress, isAddress: true },
        { data: ethers.utils.hexValue(0) },
      ];

      assertEvent(receiptSubmit, "TransactionSubmitted", eventDataSubmit);
      assertEvent(receiptConfirm, "TransactionConfirmed", eventDataConfirm);
      assertEvent(receiptExecute, "TransactionExecuted", eventDataExecute);
    });

    it("correct events are emitted for revoke", async function () {
      const payload = defaultPayload(targetContract.address, 6, 0);
      await account.invoke(multisig, "submit_transaction", payload);

      await account.invoke(multisig, "confirm_transaction", {
        nonce: 0,
      });
      const txHash = await account.invoke(multisig, "revoke_confirmation", {
        nonce: 0,
      });
      const receipt = await starknet.getTransactionReceipt(txHash);

      const eventData: IEventDataEntry[] = [
        { data: accountAddress, isAddress: true },
        { data: ethers.utils.hexValue(0) },
      ];

      assertEvent(receipt, "ConfirmationRevoked", eventData);
    });

    it("correct events are emitted for signer change", async function () {
      const toBeAddedSigner = nonSigner;
      const selector = getSelectorFromName("set_signers");
      const newSigners = [
        number.toBN(toBeAddedSigner.starknetContract.address),
      ];
      const payload = {
        to: number.toBN(multisig.address),
        function_selector: number.toBN(selector),
        calldata: [newSigners.length, ...newSigners],
        nonce: 0,
      };

      await account.invoke(multisig, "submit_transaction", payload);

      await account.invoke(multisig, "confirm_transaction", {
        nonce: 0,
      });

      const txHash = await account.invoke(multisig, "execute_transaction", {
        nonce: 0,
      });

      const receipt = await starknet.getTransactionReceipt(txHash);

      const eventData: IEventDataEntry[] = [
        { data: ethers.utils.hexValue(1) },
        { data: toBeAddedSigner.address, isAddress: true },
      ];

      assertEvent(receipt, "SignersSet", eventData);
    });

    it("correct events are emitted for threshold change", async function () {
      const selector = getSelectorFromName("set_threshold");
      const payload = {
        to: number.toBN(multisig.address),
        function_selector: number.toBN(selector),
        calldata: [1],
        nonce: 0,
      };

      await account.invoke(multisig, "submit_transaction", payload);

      await account.invoke(multisig, "confirm_transaction", {
        nonce: 0,
      });

      const txHash = await account.invoke(multisig, "execute_transaction", {
        nonce: 0,
      });

      const receipt = await starknet.getTransactionReceipt(txHash);

      const eventData: IEventDataEntry[] = [{ data: ethers.utils.hexValue(1) }];

      assertEvent(receipt, "ThresholdSet", eventData);
    });

    it("correct events are emitted for signer and implicit threshold change", async function () {
      const toBeAddedSigner = nonSigner;
      // First change the list of signers to 2 and threshold to 2
      {
        const selector = getSelectorFromName("set_signers_and_threshold");
        const newSigners = [account.address, toBeAddedSigner.address];
        const payload = {
          to: number.toBN(multisig.address),
          function_selector: number.toBN(selector),
          calldata: [newSigners.length, ...newSigners, newSigners.length],
          nonce: 0,
        };
        await account.invoke(multisig, "submit_transaction", payload);

        await account.invoke(multisig, "confirm_transaction", {
          nonce: 0,
        });

        await account.invoke(multisig, "execute_transaction", {
          nonce: 0,
        });
      }

      // Change signers to a list of 1
      const selector = getSelectorFromName("set_signers");
      const newSigners = [account.address];
      const payload = {
        to: number.toBN(multisig.address),
        function_selector: number.toBN(selector),
        calldata: [newSigners.length, ...newSigners],
        nonce: 1,
      };
      await account.invoke(multisig, "submit_transaction", payload);

      await account.invoke(multisig, "confirm_transaction", {
        nonce: 1,
      });
      await toBeAddedSigner.invoke(multisig, "confirm_transaction", {
        nonce: 1,
      });

      const txHash = await account.invoke(multisig, "execute_transaction", {
        nonce: 1,
      });

      const receipt = await starknet.getTransactionReceipt(txHash);

      const eventData0: IEventDataEntry[] = [
        { data: ethers.utils.hexValue(1) },
        { data: account.address, isAddress: true },
      ];

      const eventData1: IEventDataEntry[] = [
        { data: ethers.utils.hexValue(1) },
      ];

      assertEvent(receipt, "SignersSet", eventData0);
      assertEvent(receipt, "ThresholdSet", eventData1);
    });
  });

  describe(" - signers and threshold - ", function () {
    it("set_threshold and set_signers_and_threshold work", async function () {
      const toBeAddedSigner = nonSigner;
      {
        // increase signers so we can later decrease threshold
        const selector = getSelectorFromName("set_signers_and_threshold");
        const newSigners = [
          number.toBN(account.starknetContract.address),
          number.toBN(toBeAddedSigner.starknetContract.address),
        ];

        const payload = {
          to: number.toBN(multisig.address),
          function_selector: number.toBN(selector),
          calldata: [newSigners.length, ...newSigners, 2],
          nonce: 0,
        };

        await account.invoke(multisig, "submit_transaction", payload);

        await account.invoke(multisig, "confirm_transaction", {
          nonce: 0,
        });
        await account.invoke(multisig, "execute_transaction", {
          nonce: 0,
        });
      }
      {
        // check that lowering threshold works
        const selector = getSelectorFromName("set_threshold");
        const payload = {
          to: number.toBN(multisig.address),
          function_selector: number.toBN(selector),
          calldata: [1],
          nonce: 1,
        };

        await account.invoke(multisig, "submit_transaction", payload);

        await account.invoke(multisig, "confirm_transaction", {
          nonce: 1,
        });
        await toBeAddedSigner.invoke(multisig, "confirm_transaction", {
          nonce: 1,
        });
        await account.invoke(multisig, "execute_transaction", {
          nonce: 1,
        });
        const res = await account.call(multisig, "get_threshold");
        expect(res.threshold).to.equal(1n);
      }
      {
        // check that increasing threshold works
        const selector = getSelectorFromName("set_threshold");
        const payload = {
          to: number.toBN(multisig.address),
          function_selector: number.toBN(selector),
          calldata: [2],
          nonce: 2,
        };

        await account.invoke(multisig, "submit_transaction", payload);

        await account.invoke(multisig, "confirm_transaction", {
          nonce: 2,
        });
        await account.invoke(multisig, "execute_transaction", {
          nonce: 2,
        });

        const res = await account.call(multisig, "get_threshold");
        expect(res.threshold).to.equal(2n);
      }
    });

    it("set_signers works", async function () {
      const toBeAddedSigner = nonSigner;
      const selector = getSelectorFromName("set_signers");
      const newSigners = [
        number.toBN(account.starknetContract.address),
        number.toBN(toBeAddedSigner.starknetContract.address),
      ];
      const payload = {
        to: number.toBN(multisig.address),
        function_selector: number.toBN(selector),
        calldata: [newSigners.length, ...newSigners],
        nonce: 0,
      };

      await account.invoke(multisig, "submit_transaction", payload);

      await account.invoke(multisig, "confirm_transaction", {
        nonce: 0,
      });

      await account.invoke(multisig, "execute_transaction", {
        nonce: 0,
      });

      const res = await multisig.call("get_signers");
      expect(res.signers_len).to.equal(2n);
      expect(res.signers.map((address: any) => address.toString())).to.eql(
        newSigners.map((address) => address.toString())
      );
    });

    it("setting an invalid threshold fails", async function () {
      const toBeAddedSigner = nonSigner;
      const selector = getSelectorFromName("set_signers_and_threshold");
      const newSigners = [
        number.toBN(account.starknetContract.address),
        number.toBN(toBeAddedSigner.starknetContract.address),
      ];
      const payload = {
        to: number.toBN(multisig.address),
        function_selector: number.toBN(selector),
        calldata: [
          newSigners.length,
          ...newSigners, // new signers
          3, // threshold
        ],
        nonce: 0,
      };

      await account.invoke(multisig, "submit_transaction", payload);

      await account.invoke(multisig, "confirm_transaction", {
        nonce: 0,
      });

      try {
        await account.invoke(multisig, "execute_transaction", {
          nonce: 0,
        });
        expect.fail("Should have failed");
      } catch (err: any) {
        assertErrorMsg(err.message, "Invalid threshold");
      }
    });

    it("setting non-unique signers fails", async () => {
      const selector = getSelectorFromName("set_signers");
      const newSigners = [
        number.toBN(account.starknetContract.address),
        number.toBN(account.starknetContract.address),
      ];

      const payload = {
        to: number.toBN(multisig.address),
        function_selector: number.toBN(selector),
        calldata: [newSigners.length, ...newSigners],
        nonce: 0,
      };

      await account.invoke(multisig, "submit_transaction", payload);
      await account.invoke(multisig, "confirm_transaction", {
        nonce: 0,
      });

      try {
        await account.invoke(multisig, "execute_transaction", {
          nonce: 0,
        });
        expect.fail("Should have failed");
      } catch (err: any) {
        assertErrorMsg(err.message, "Signers not unique");
      }
    });

    it("previous transactions get invalidated when signer set changes", async function () {
      const numTxToSpawn = 5;
      for (let i = 0; i < numTxToSpawn; i++) {
        const payload = defaultPayload(targetContract.address, 101 + i, i);
        await account.invoke(multisig, "submit_transaction", payload);
      }

      // Executed set_signers invalidates previous transactions
      const invalidatingNonce = numTxToSpawn;
      const selector = getSelectorFromName("set_signers_and_threshold");
      const toBeAddedSigner = nonSigner;
      const newSigners = [
        number.toBN(account.starknetContract.address),
        number.toBN(toBeAddedSigner.starknetContract.address),
      ];
      const payload = {
        to: number.toBN(multisig.address),
        function_selector: number.toBN(selector),
        calldata: [
          newSigners.length,
          ...newSigners, // signers
          2, // threshold
        ],
        nonce: invalidatingNonce,
      };

      await account.invoke(multisig, "submit_transaction", payload);

      await account.invoke(multisig, "confirm_transaction", {
        nonce: invalidatingNonce,
      });
      await account.invoke(multisig, "execute_transaction", {
        nonce: invalidatingNonce,
      });

      // try to confirm invalid transaction
      try {
        await account.invoke(multisig, "confirm_transaction", {
          nonce: invalidatingNonce - 1,
        });
        expect.fail("Should have failed");
      } catch (err: any) {
        assertErrorMsg(
          err.message,
          "Transaction invalidated: config changed after submission"
        );
      }

      {
        const res = await account.call(multisig, "get_threshold");
        expect(res.threshold).to.equal(2n);
      }

      {
        const res = await account.call(multisig, "get_signers");
        expect(res.signers_len).to.equal(2n);
        expect(res.signers.map((address: any) => address.toString())).to.eql(
          newSigners.map((address) => address.toString())
        );
      }
    });

    it("direct call fails to set_signers", async function () {
      try {
        const toBeAddedSigner = nonSigner;
        const newSigners = [
          number.toBN(account.starknetContract.address),
          number.toBN(toBeAddedSigner.starknetContract.address),
        ];
        await account.invoke(multisig, "set_signers", { signers: newSigners });

        expect.fail("Should have failed");
      } catch (err: any) {
        assertErrorMsg(err.message, "Access denied - only multisig allowed");
      }
    });

    it("direct call fails to set_threshold", async function () {
      try {
        await account.invoke(multisig, "set_threshold", { threshold: 1 });

        expect.fail("Should have failed");
      } catch (err: any) {
        assertErrorMsg(err.message, "Access denied - only multisig allowed");
      }
    });

    it("direct call fails to set_signers_and_threshold", async function () {
      try {
        const toBeAddedSigner = nonSigner;
        const newSigners = [
          number.toBN(account.starknetContract.address),
          number.toBN(toBeAddedSigner.starknetContract.address),
        ];

        await account.invoke(multisig, "set_signers_and_threshold", {
          signers: newSigners,
          threshold: 2,
        });

        expect.fail("Should have failed");
      } catch (err: any) {
        assertErrorMsg(err.message, "Access denied - only multisig allowed");
      }
    });

    it("transactions after settings zero signers fail", async () => {
      const numOfSigners = 0;
      const selector = getSelectorFromName("set_signers");
      const payload = {
        to: number.toBN(multisig.address),
        function_selector: number.toBN(selector),
        calldata: [numOfSigners],
        nonce: 0,
      };

      await account.invoke(multisig, "submit_transaction", payload);

      await account.invoke(multisig, "confirm_transaction", {
        nonce: 0,
      });

      await account.invoke(multisig, "execute_transaction", {
        nonce: 0,
      });

      const signers = await multisig.call("get_signers");
      expect(signers.signers_len).to.equal(0n);

      // No one shall be able to submit new transactions anymore
      try {
        const payload = defaultPayload(targetContract.address, 66, 1);
        await account.invoke(multisig, "submit_transaction", payload);
        expect.fail("Should have failed");
      } catch (err: any) {
        assertErrorMsg(err.message, "Invalid signer");
      }
    });
  });
});

describe("Multisig with multiple signers", function () {
  this.timeout(300_000);

  let targetFactory: StarknetContractFactory;
  let targetContract: StarknetContract;
  let multisig: StarknetContract;

  let account1: Account;
  let account2: Account;
  let account3: Account;

  before(async function () {
    starknet.devnet.restart();

    account1 = await starknet.deployAccount("OpenZeppelin");
    account2 = await starknet.deployAccount("OpenZeppelin");
    account3 = await starknet.deployAccount("OpenZeppelin");

    const multisigFactory = await starknet.getContractFactory("Multisig");
    multisig = await multisigFactory.deploy({
      signers: [
        number.toBN(account1.starknetContract.address),
        number.toBN(account2.starknetContract.address),
        number.toBN(account3.starknetContract.address),
      ],
      threshold: 2,
    });

    targetFactory = await starknet.getContractFactory("Target");
    targetContract = await targetFactory.deploy();

    console.log("Deployment done");
    console.log("Account1: " + account1.starknetContract.address);
    console.log("Account2: " + account2.starknetContract.address);
    console.log("Account3: " + account3.starknetContract.address);

    await starknet.devnet.dump(dumpFile);
  });

  beforeEach(async function () {
    await starknet.devnet.load(dumpFile);
  });

  after(async function () {
    fs.unlink(dumpFile, () => {});
  });

  it("transaction execute works", async function () {
    const payload = defaultPayload(targetContract.address, 20, 0);

    await account1.invoke(multisig, "submit_transaction", payload);
    await account1.invoke(multisig, "confirm_transaction", {
      nonce: 0,
    });
    await account2.invoke(multisig, "confirm_transaction", {
      nonce: 0,
    });

    await account1.invoke(multisig, "execute_transaction", {
      nonce: 0,
    });

    const bal = await targetContract.call("get_balance");
    expect(bal.res).to.equal(BigInt(20));
  });

  it("transaction execute works with too many confirmations", async function () {
    const payload = defaultPayload(targetContract.address, 21, 0);

    await account1.invoke(multisig, "submit_transaction", payload);
    await account1.invoke(multisig, "confirm_transaction", {
      nonce: 0,
    });
    await account2.invoke(multisig, "confirm_transaction", {
      nonce: 0,
    });
    await account3.invoke(multisig, "confirm_transaction", {
      nonce: 0,
    });
    await account1.invoke(multisig, "execute_transaction", {
      nonce: 0,
    });

    const bal = await targetContract.call("get_balance");
    expect(bal.res).to.equal(BigInt(21));
  });

  it("transaction execute works if superfluous confirmer revokes confirmation", async function () {
    const payload = defaultPayload(targetContract.address, 22, 0);

    await account1.invoke(multisig, "submit_transaction", payload);
    await account1.invoke(multisig, "confirm_transaction", {
      nonce: 0,
    });
    await account2.invoke(multisig, "confirm_transaction", {
      nonce: 0,
    });
    await account3.invoke(multisig, "confirm_transaction", {
      nonce: 0,
    });
    await account2.invoke(multisig, "revoke_confirmation", {
      nonce: 0,
    });
    await account1.invoke(multisig, "execute_transaction", {
      nonce: 0,
    });

    const bal = await targetContract.call("get_balance");
    expect(bal.res).to.equal(BigInt(22));
  });

  it("transaction fails if too many revoke confirmation", async function () {
    const payload = defaultPayload(targetContract.address, 23, 0);

    await account1.invoke(multisig, "submit_transaction", payload);
    await account1.invoke(multisig, "confirm_transaction", {
      nonce: 0,
    });
    await account2.invoke(multisig, "confirm_transaction", {
      nonce: 0,
    });
    await account3.invoke(multisig, "confirm_transaction", {
      nonce: 0,
    });
    await account2.invoke(multisig, "revoke_confirmation", {
      nonce: 0,
    });
    await account1.invoke(multisig, "revoke_confirmation", {
      nonce: 0,
    });

    try {
      await account3.invoke(multisig, "execute_transaction", {
        nonce: 0,
      });
      expect.fail("Should have failed");
    } catch (err: any) {
      assertErrorMsg(err.message, "More confirmations required");
    }
  });

  it("lowering the amount of signers automatically lowers the threshold", async function () {
    const selector = getSelectorFromName("set_signers");
    const newSigners = [number.toBN(account2.starknetContract.address)];
    const payload = {
      to: number.toBN(multisig.address),
      function_selector: number.toBN(selector),
      calldata: [newSigners.length, ...newSigners],
      nonce: 0,
    };

    await account2.invoke(multisig, "submit_transaction", payload);

    await account2.invoke(multisig, "confirm_transaction", {
      nonce: 0,
    });
    await account3.invoke(multisig, "confirm_transaction", {
      nonce: 0,
    });

    await account2.invoke(multisig, "execute_transaction", {
      nonce: 0,
    });

    const res = await account2.call(multisig, "get_signers");
    expect(res.signers_len).to.equal(1n);
    expect(res.signers.map((address: any) => address.toString())).to.eql(
      newSigners.map((address) => address.toString())
    );
  });
});
