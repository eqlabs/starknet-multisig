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
  let privateKey: string;
  let publicKey: string;

  before(async function () {
    account = await starknet.deployAccount("OpenZeppelin");
    nonSigner = await starknet.deployAccount("OpenZeppelin");

    accountAddress = account.starknetContract.address;
    privateKey = account.privateKey;
    publicKey = account.publicKey;

    let multisigFactory = await starknet.getContractFactory("Multisig");
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
    await new Promise((f) => setTimeout(f, 1000)); // to allow the dump to complete
  });

  beforeEach(async function () {
    await starknet.devnet.load(dumpFile);
  });

  after(async function () {
    fs.unlink(dumpFile, () => {});
  });

  describe(" - submit - ", function () {
    it("transaction submit works", async function () {
      const selector = number.toBN(getSelectorFromName("set_balance"));
      const target = number.toBN(targetContract.address);
      const payload = {
        to: target,
        function_selector: selector,
        calldata: [5],
        nonce: 0,
      };

      await account.invoke(multisig, "submit_transaction", payload);
      const res = await multisig.call("get_transaction", {
        nonce: 0,
      });

      expect(res.tx.to.toString()).to.equal(target.toString());
      expect(res.tx.function_selector.toString()).to.equal(selector.toString());
      expect(res.tx.calldata_len).to.equal(1n);
      expect(res.tx.executed).to.equal(0n);
      expect(res.tx.threshold).to.equal(0n);
      expect(res.tx_calldata_len).to.equal(1n);
      expect(res.tx_calldata[0]).to.equal(5n);
    });

    it("fails for too big transaction nonce", async function () {
      const nonce = Number((await multisig.call("get_transactions_len")).res);

      const payload = defaultPayload(targetContract.address, 6, nonce);
      payload.nonce = nonce + 5;

      try {
        await account.invoke(multisig, "submit_transaction", payload);
        expect.fail("Should have failed");
      } catch (err: any) {
        assertErrorMsg(err.message, "invalid nonce");
      }
    });

    it("fails for too small transaction nonce", async function () {
      const nonce = Number((await multisig.call("get_transactions_len")).res);

      const payload = defaultPayload(targetContract.address, 6, nonce);
      payload.nonce = nonce - 5;

      try {
        await account.invoke(multisig, "submit_transaction", payload);
        expect.fail("Should have failed");
      } catch (err: any) {
        assertErrorMsg(err.message, "invalid nonce");
      }
    });

    it("transaction execute works", async function () {
      const payload = defaultPayload(targetContract.address, 6, 0);
      await account.invoke(multisig, "submit_transaction", payload);
      await account.invoke(multisig, "confirm_transaction", {
        nonce: 0,
      });
      await account.invoke(multisig, "execute_transaction", {
        nonce: 0,
      });

      const bal = await targetContract.call("get_balance");
      expect(bal.res).to.equal(BigInt(6));
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
      let nonce = Number((await multisig.call("get_transactions_len")).res);
      let payload = defaultPayload(targetContract.address, 17, nonce);
      await account.invoke(multisig, "submit_transaction", payload);
      const nonce1 =
        Number((await multisig.call("get_transactions_len")).res) - 1;

      payload = defaultPayload(targetContract.address, 18, nonce + 1);
      await account.invoke(multisig, "submit_transaction", payload);
      const nonce2 =
        Number((await multisig.call("get_transactions_len")).res) - 1;

      payload = defaultPayload(targetContract.address, 19, nonce + 2);
      await account.invoke(multisig, "submit_transaction", payload);
      const nonce3 =
        Number((await multisig.call("get_transactions_len")).res) - 1;

      // confirm in any order (skip one)
      await account.invoke(multisig, "confirm_transaction", {
        nonce: nonce3,
      });
      await account.invoke(multisig, "confirm_transaction", {
        nonce: nonce1,
      });

      await account.invoke(multisig, "execute_transaction", {
        nonce: nonce3,
      });
      const bal3 = await targetContract.call("get_balance");

      // confirm also the one unconfirmed
      await account.invoke(multisig, "confirm_transaction", {
        nonce: nonce2,
      });

      await account.invoke(multisig, "execute_transaction", {
        nonce: nonce1,
      });
      const bal1 = await targetContract.call("get_balance");

      await account.invoke(multisig, "execute_transaction", {
        nonce: nonce2,
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

    it("transaction execute fails if no confirmations", async function () {
      const payload = defaultPayload(targetContract.address, 9, 0);

      await account.invoke(multisig, "submit_transaction", payload);
      try {
        await account.invoke(multisig, "execute_transaction", {
          nonce: 0,
        });
        expect.fail("Should have failed");
      } catch (err: any) {
        assertErrorMsg(err.message, "need more confirmations");
      }
    });

    it("non-signer can't submit a transaction", async function () {
      const payload = defaultPayload(targetContract.address, 10, 0);

      try {
        await nonSigner.invoke(multisig, "submit_transaction", payload);
        expect.fail("Should have failed");
      } catch (err: any) {
        assertErrorMsg(err.message, "not signer");
      }
    });

    it("executing a failing transaction fails", async function () {
      const selector = number.toBN(getSelectorFromName("revertFunc"));
      const nonce = Number((await multisig.call("get_transactions_len")).res);
      const target = number.toBN(targetContract.address);
      const payload = {
        to: target,
        function_selector: selector,
        calldata: [],
        nonce: nonce,
      };
      await account.invoke(multisig, "submit_transaction", payload);

      await account.invoke(multisig, "confirm_transaction", {
        nonce: nonce,
      });

      try {
        await account.invoke(multisig, "execute_transaction", {
          nonce: nonce,
        });
        expect.fail("Should have failed");
      } catch (err: any) {
        assertGenericRevert(err.message);
      }
    });

    it("executing a transaction to a non-existing function fails", async function () {
      const selector = number.toBN(getSelectorFromName("nonExisting"));
      const nonce = Number((await multisig.call("get_transactions_len")).res);
      const target = number.toBN(targetContract.address);
      const payload = {
        to: target,
        function_selector: selector,
        calldata: [],
        nonce: nonce,
      };
      await account.invoke(multisig, "submit_transaction", payload);
      await account.invoke(multisig, "confirm_transaction", {
        nonce: nonce,
      });

      try {
        await account.invoke(multisig, "execute_transaction", {
          nonce: nonce,
        });
        expect.fail("Should have failed");
      } catch (err: any) {
        assertGenericRevert(err.message);
      }
    });
  });

  describe("- confirmation - ", function () {
    it("non-signer can't confirm a transaction", async function () {
      const payload = defaultPayload(targetContract.address, 15, 0);

      await account.invoke(multisig, "submit_transaction", payload);
      try {
        await nonSigner.invoke(multisig, "confirm_transaction", {
          nonce: 0,
        });
        expect.fail("Should have failed");
      } catch (err: any) {
        assertErrorMsg(err.message, "not signer");
      }
    });

    it("can't confirm a non-existing transaction", async function () {
      try {
        await account.invoke(multisig, "confirm_transaction", {
          nonce: 500,
        });
        expect.fail("Should have failed");
      } catch (err: any) {
        assertErrorMsg(err.message, "tx does not exist");
      }
    });

    it("can't confirm an executed transaction", async function () {
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
        assertErrorMsg(err.message, "tx already executed");
      }
    });

    it("can't reconfirm a transaction", async function () {
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
        assertErrorMsg(err.message, "tx already confirmed");
      }
    });
  });

  describe("- revocation -", function () {
    it("non-signer can't revoke a confirmation", async function () {
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
        assertErrorMsg(err.message, "not signer");
      }
    });

    it("can't revoke a confirmation for a non-existing transaction", async function () {
      try {
        await account.invoke(multisig, "revoke_confirmation", {
          nonce: 5000,
        });
        expect.fail("Should have failed");
      } catch (err: any) {
        assertErrorMsg(err.message, "tx does not exist");
      }
    });

    it("can't revoke a confirmation for an executed transaction", async function () {
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
        assertErrorMsg(err.message, "tx already executed");
      }
    });

    it("can't re-revoke an already revoked transaction confirmation", async function () {
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
        assertErrorMsg(err.message, "tx not confirmed");
      }
    });
  });

  describe("- execution -", function () {
    it("non-signer can't execute a transaction", async function () {
      const payload = defaultPayload(targetContract.address, 10, 0);

      await account.invoke(multisig, "submit_transaction", payload);
      await account.invoke(multisig, "confirm_transaction", {
        nonce: 0,
      });

      await nonSigner.invoke(multisig, "execute_transaction", {
        nonce: 0,
      });
    });

    it("executing a failing transaction fails", async function () {
      const selector = number.toBN(getSelectorFromName("revertFunc"));
      const target = number.toBN(targetContract.address);
      const nonce = Number((await multisig.call("get_transactions_len")).res);
      const payload = {
        to: target,
        function_selector: selector,
        calldata: [],
        nonce: nonce,
      };
      await account.invoke(multisig, "submit_transaction", payload);
      await account.invoke(multisig, "confirm_transaction", {
        nonce: nonce,
      });

      try {
        await account.invoke(multisig, "execute_transaction", {
          nonce: nonce,
        });
        expect.fail("Should have failed");
      } catch (err: any) {
        // Couldn't find anything precise in the error message to detect unspecified revert. These two are the best I could come up with
        // This is checked so that we know there's a problem in the "call_contract" part
        expect(err.message.includes("call_contract")).to.true;
        // I guess this is included in all error messages, but at least this checks that it's an execution error
        expect(err.message.includes("Got an exception while executing a hint"))
          .to.true;
      }
    });

    it("can't execute a non-existing transaction", async function () {
      try {
        await account.invoke(multisig, "execute_transaction", {
          nonce: 600,
        });
        expect.fail("Should have failed");
      } catch (err: any) {
        assertErrorMsg(err.message, "tx does not exist");
      }
    });

    it("can't re-execute a transaction", async function () {
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
        assertErrorMsg(err.message, "tx already executed");
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

      assertEvent(receiptSubmit, "SubmitTransaction", eventDataSubmit);
      assertEvent(receiptConfirm, "ConfirmTransaction", eventDataConfirm);
      assertEvent(receiptExecute, "ExecuteTransaction", eventDataExecute);
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

      assertEvent(receipt, "RevokeConfirmation", eventData);
    });

    it("correct events are emitted for signer change", async function () {
      const selector = getSelectorFromName("set_signers");
      const newSigners = [number.toBN(nonSigner.starknetContract.address)];
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
        { data: nonSigner.address, isAddress: true },
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
      // First change the list of signers to 2 and threshold to 2
      {
        const selector = getSelectorFromName("set_signers_and_threshold");
        const newSigners = [account.address, nonSigner.address];
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
      await nonSigner.invoke(multisig, "confirm_transaction", {
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
    account1 = await starknet.deployAccount("OpenZeppelin");
    account2 = await starknet.deployAccount("OpenZeppelin");
    account3 = await starknet.deployAccount("OpenZeppelin");

    let multisigFactory = await starknet.getContractFactory("Multisig");
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
    await new Promise((f) => setTimeout(f, 1000)); // to allow the dump to complete
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
      assertErrorMsg(err.message, "need more confirmations");
    }
  });

  // Tests below are interdependent and shall be run sequentially
  it("transaction sets new signers", async function () {
    const selector = getSelectorFromName("set_signers");
    const newSigners = [
      number.toBN(account2.starknetContract.address),
      number.toBN(account3.starknetContract.address),
    ];
    const payload = {
      to: number.toBN(multisig.address),
      function_selector: number.toBN(selector),
      calldata: [newSigners.length, ...newSigners],
      nonce: 0,
    };

    await account1.invoke(multisig, "submit_transaction", payload);

    await account1.invoke(multisig, "confirm_transaction", {
      nonce: 0,
    });
    await account3.invoke(multisig, "confirm_transaction", {
      nonce: 0,
    });

    await account1.invoke(multisig, "execute_transaction", {
      nonce: 0,
    });

    const res = await account2.call(multisig, "get_signers");
    expect(res.signers_len).to.equal(2n);
    expect(res.signers.map((address: any) => address.toString())).to.eql(
      newSigners.map((address) => address.toString())
    );
  });

  it("set single signer thus lowering threshold", async function () {
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

  // FIXME: has weird dependencies to other tests and breaks with idempotency
  xit("invalidate previous transactions with set signers", async function () {
    const numTxToSpawn = 5;
    for (let i = 0; i < numTxToSpawn; i++) {
      const nonce = Number((await multisig.call("get_transactions_len")).res);
      const payload = defaultPayload(targetContract.address, 101 + i, nonce);
      await account2.invoke(multisig, "submit_transaction", payload);
    }

    // Executed set_signers invalidates previous transactions
    const invalidatingNonce = Number(
      (await multisig.call("get_transactions_len")).res
    );
    const selector = getSelectorFromName("set_signers_and_threshold");
    const newSigners = [
      number.toBN(account2.starknetContract.address),
      number.toBN(account1.starknetContract.address),
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

    await account2.invoke(multisig, "submit_transaction", payload);

    await account2.invoke(multisig, "confirm_transaction", {
      nonce: invalidatingNonce,
    });
    await account2.invoke(multisig, "execute_transaction", {
      nonce: invalidatingNonce,
    });

    // try to confirm invalid transaction
    try {
      await account1.invoke(multisig, "confirm_transaction", {
        nonce: invalidatingNonce - Math.round(numTxToSpawn / 2),
      });
      expect.fail("Should have failed");
    } catch (err: any) {
      assertErrorMsg(
        err.message,
        "tx invalidated: config changed after submission"
      );
    }

    {
      const res = await account1.call(multisig, "get_threshold");
      expect(res.threshold).to.equal(2n);
    }

    {
      const res = await account1.call(multisig, "get_signers");
      expect(res.signers_len).to.equal(2n);
      expect(res.signers.map((address: any) => address.toString())).to.eql(
        newSigners.map((address) => address.toString())
      );
    }
  });

  it("set invalid threshold", async function () {
    const selector = getSelectorFromName("set_signers_and_threshold");
    const newSigners = [
      number.toBN(account2.starknetContract.address),
      number.toBN(account3.starknetContract.address),
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

    await account2.invoke(multisig, "submit_transaction", payload);

    await account1.invoke(multisig, "confirm_transaction", {
      nonce: 0,
    });
    await account2.invoke(multisig, "confirm_transaction", {
      nonce: 0,
    });

    try {
      await account2.invoke(multisig, "execute_transaction", {
        nonce: 0,
      });
      expect.fail("Should have failed");
    } catch (err: any) {
      assertErrorMsg(err.message, "invalid parameters");
    }
  });

  it("deploy multisig with invalid threshold fails", async function () {
    const multisigFactory = await starknet.getContractFactory("Multisig");

    try {
      await multisigFactory.deploy({
        signers: [
          number.toBN(account1.starknetContract.address),
          number.toBN(account2.starknetContract.address),
          number.toBN(account3.starknetContract.address),
        ],
        threshold: 4,
      });
      expect.fail("Should have failed");
    } catch (err: any) {
      assertErrorMsg(err.message, "invalid parameters");
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
      assertErrorMsg(err.message, "invalid parameters");
    }
  });

  it("non recursive call fails", async function () {
    try {
      const newSigners = [
        number.toBN(account2.starknetContract.address),
        number.toBN(account3.starknetContract.address),
      ];
      await account1.invoke(multisig, "set_signers", { signers: newSigners });

      expect.fail("Should have failed");
    } catch (err: any) {
      assertErrorMsg(err.message, "access restricted to multisig");
    }
  });

  it("set 0 signers", async () => {
    const numOfSigners = 0;
    const selector = getSelectorFromName("set_signers");
    const payload = {
      to: number.toBN(multisig.address),
      function_selector: number.toBN(selector),
      calldata: [numOfSigners],
      nonce: 0,
    };

    await account2.invoke(multisig, "submit_transaction", payload);

    await account2.invoke(multisig, "confirm_transaction", {
      nonce: 0,
    });
    await account1.invoke(multisig, "confirm_transaction", {
      nonce: 0,
    });

    // Execution shall be allowed from any account
    await account3.invoke(multisig, "execute_transaction", {
      nonce: 0,
    });

    // No one shall be able to submit new transactions anymore
    try {
      const payload = defaultPayload(targetContract.address, 66, 1);
      await account2.invoke(multisig, "submit_transaction", payload);
    } catch (err: any) {
      assertErrorMsg(err.message, "not signer");
    }
  });
});
