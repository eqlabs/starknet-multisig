import { expect } from "chai";
import { assert } from "console";
import { BigNumber } from "ethers";
import { starknet } from "hardhat";
import {
  StarknetContract,
  StarknetContractFactory,
  Account,
} from "hardhat/types/runtime";
import { number, stark } from "starknet";
import { getSelectorFromName } from "starknet/dist/utils/hash";

describe("Multisig with single owner", function () {
  this.timeout(300_000);

  let contractFactory: StarknetContractFactory;
  let targetContract: StarknetContract;
  let multisig: StarknetContract;

  let account: Account;
  let nonOwner: Account;
  let accountAddress: string;
  let privateKey: string;
  let publicKey: string;

  // should be beforeeach, but that'd be horribly slow. Just remember that the tests are not idempotent
  before(async function () {
    account = await starknet.deployAccount("OpenZeppelin");
    nonOwner = await starknet.deployAccount("OpenZeppelin");

    accountAddress = account.starknetContract.address;
    privateKey = account.privateKey;
    publicKey = account.publicKey;

    let multisigFactory = await starknet.getContractFactory("Multisig");
    multisig = await multisigFactory.deploy({
      owners: [number.toBN(accountAddress)],
      confirmations_required: 1,
    });

    contractFactory = await starknet.getContractFactory("Target");
    targetContract = await contractFactory.deploy();

    console.log("Deployed target contract at", targetContract.address);
    console.log(
      "Deployed account at address:",
      account.starknetContract.address
    );
  });

  describe(" - submit - ", function () {
    it("transaction submit works", async function () {
      const selector = number.toBN(getSelectorFromName("set_balance"));
      const target = number.toBN(targetContract.address);
      const payload = {
        to: target,
        function_selector: selector,
        calldata: [5],
      };
      await account.invoke(multisig, "submit_transaction", payload);

      const txIndex =
        Number((await multisig.call("get_transactions_len")).res) - 1;

      const res = await multisig.call("get_transaction", {
        tx_index: txIndex,
      });

      expect(res.tx.to.toString()).to.equal(target.toString());
      expect(res.tx.function_selector.toString()).to.equal(selector.toString());
      expect(res.tx.calldata_len).to.equal(1n);
      expect(res.tx.executed).to.equal(0n);
      expect(res.tx.num_confirmations).to.equal(0n);
      expect(res.tx_calldata_len).to.equal(1n);
      expect(res.tx_calldata[0]).to.equal(5n);
    });

    it("transaction execute works", async function () {
      const payload = defaultPayload(targetContract.address, 6);
      await account.invoke(multisig, "submit_transaction", payload);
      const txIndex =
        Number((await multisig.call("get_transactions_len")).res) - 1;
      await account.invoke(multisig, "confirm_transaction", {
        tx_index: txIndex,
      });
      await account.invoke(multisig, "execute_transaction", {
        tx_index: txIndex,
      });

      const bal = await targetContract.call("get_balance");
      expect(bal.res).to.equal(BigInt(6));
    });

    it("transaction execute works for subsequent transactions", async function () {
      let payload = defaultPayload(targetContract.address, 7);
      await account.invoke(multisig, "submit_transaction", payload);
      let txIndex =
        Number((await multisig.call("get_transactions_len")).res) - 1;
      await account.invoke(multisig, "confirm_transaction", {
        tx_index: txIndex,
      });
      await account.invoke(multisig, "execute_transaction", {
        tx_index: txIndex,
      });

      // submit another transaction with the same multisig
      payload = defaultPayload(targetContract.address, 8);
      await account.invoke(multisig, "submit_transaction", payload);
      txIndex = Number((await multisig.call("get_transactions_len")).res) - 1;
      await account.invoke(multisig, "confirm_transaction", {
        tx_index: txIndex,
      });
      await account.invoke(multisig, "execute_transaction", {
        tx_index: txIndex,
      });

      const bal = await targetContract.call("get_balance");
      expect(bal.res).to.equal(BigInt(8));
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
      };

      await account.invoke(multisig, "submit_transaction", payload);
      const txIndex =
        Number((await multisig.call("get_transactions_len")).res) - 1;
      await account.invoke(multisig, "confirm_transaction", {
        tx_index: txIndex,
      });
      await account.invoke(multisig, "execute_transaction", {
        tx_index: txIndex,
      });

      const bal = await targetContract.call("getArraySum");
      const sum = simpleArray
        .concat(Object.values(structArrayData[0]))
        .concat(Object.values(structArrayData[1]))
        .reduce((a, b) => a + b, 0);

      expect(bal.res).to.equal(BigInt(sum));
    });

    it("transaction execute fails if no confirmations", async function () {
      const payload = defaultPayload(targetContract.address, 9);
      await account.invoke(multisig, "submit_transaction", payload);
      const txIndex =
        Number((await multisig.call("get_transactions_len")).res) - 1;
      try {
        await account.invoke(multisig, "execute_transaction", {
          tx_index: txIndex,
        });
        expect.fail("Should have failed");
      } catch (err: any) {
        assertErrorMsg(err.message, "need more confirmations");
      }
    });

    it("non-owner can't submit a transaction", async function () {
      const payload = defaultPayload(targetContract.address, 10);

      try {
        await nonOwner.invoke(multisig, "submit_transaction", payload);
        expect.fail("Should have failed");
      } catch (err: any) {
        assertErrorMsg(err.message, "not owner");
      }
    });
  });

  describe("- confirmation - ", function () {
    it("non-owner can't confirm a transaction", async function () {
      const payload = defaultPayload(targetContract.address, 15);
      await account.invoke(multisig, "submit_transaction", payload);
      let txIndex =
        Number((await multisig.call("get_transactions_len")).res) - 1;
      try {
        await nonOwner.invoke(multisig, "confirm_transaction", {
          tx_index: txIndex,
        });
        expect.fail("Should have failed");
      } catch (err: any) {
        assertErrorMsg(err.message, "not owner");
      }
    });

    it("can't confirm a non-existing transaction", async function () {
      try {
        await account.invoke(multisig, "confirm_transaction", {
          tx_index: 500,
        });
        expect.fail("Should have failed");
      } catch (err: any) {
        assertErrorMsg(err.message, "tx does not exist");
      }
    });

    it("can't confirm an executed transaction", async function () {
      const payload = defaultPayload(targetContract.address, 16);
      await account.invoke(multisig, "submit_transaction", payload);
      let txIndex =
        Number((await multisig.call("get_transactions_len")).res) - 1;
      await account.invoke(multisig, "confirm_transaction", {
        tx_index: txIndex,
      });

      await account.invoke(multisig, "execute_transaction", {
        tx_index: txIndex,
      });

      try {
        await account.invoke(multisig, "confirm_transaction", {
          tx_index: txIndex,
        });
        expect.fail("Should have failed");
      } catch (err: any) {
        assertErrorMsg(err.message, "tx already executed");
      }
    });

    it("can't reconfirm a transaction", async function () {
      const payload = defaultPayload(targetContract.address, 10);
      await account.invoke(multisig, "submit_transaction", payload);
      let txIndex =
        Number((await multisig.call("get_transactions_len")).res) - 1;
      await account.invoke(multisig, "confirm_transaction", {
        tx_index: txIndex,
      });

      try {
        await account.invoke(multisig, "confirm_transaction", {
          tx_index: txIndex,
        });
        expect.fail("Should have failed");
      } catch (err: any) {
        assertErrorMsg(err.message, "tx already confirmed");
      }
    });
  });

  describe("- revocation -", function () {
    it("non-owner can't revoke a confirmation", async function () {
      const payload = defaultPayload(targetContract.address, 10);
      await account.invoke(multisig, "submit_transaction", payload);
      let txIndex =
        Number((await multisig.call("get_transactions_len")).res) - 1;
      await account.invoke(multisig, "confirm_transaction", {
        tx_index: txIndex,
      });

      try {
        await nonOwner.invoke(multisig, "revoke_confirmation", {
          tx_index: txIndex,
        });
        expect.fail("Should have failed");
      } catch (err: any) {
        assertErrorMsg(err.message, "not owner");
      }
    });

    it("can't revoke a confirmation for a non-existing transaction", async function () {
      try {
        await account.invoke(multisig, "revoke_confirmation", {
          tx_index: 5000,
        });
        expect.fail("Should have failed");
      } catch (err: any) {
        assertErrorMsg(err.message, "tx does not exist");
      }
    });

    it("can't revoke a confirmation for an executed transaction", async function () {
      const payload = defaultPayload(targetContract.address, 10);
      await account.invoke(multisig, "submit_transaction", payload);
      let txIndex =
        Number((await multisig.call("get_transactions_len")).res) - 1;
      await account.invoke(multisig, "confirm_transaction", {
        tx_index: txIndex,
      });

      await account.invoke(multisig, "execute_transaction", {
        tx_index: txIndex,
      });

      try {
        await account.invoke(multisig, "revoke_confirmation", {
          tx_index: txIndex,
        });
        expect.fail("Should have failed");
      } catch (err: any) {
        assertErrorMsg(err.message, "tx already executed");
      }
    });

    it("can't re-revoke an already revoked transaction confirmation", async function () {
      const payload = defaultPayload(targetContract.address, 10);
      await account.invoke(multisig, "submit_transaction", payload);
      let txIndex =
        Number((await multisig.call("get_transactions_len")).res) - 1;
      await account.invoke(multisig, "confirm_transaction", {
        tx_index: txIndex,
      });

      await account.invoke(multisig, "revoke_confirmation", {
        tx_index: txIndex,
      });

      try {
        await account.invoke(multisig, "revoke_confirmation", {
          tx_index: txIndex,
        });
        expect.fail("Should have failed");
      } catch (err: any) {
        assertErrorMsg(err.message, "tx not confirmed");
      }
    });
  });

  describe("- execution -", function () {
    it("non-owner can't execute a transaction", async function () {
      const payload = defaultPayload(targetContract.address, 10);
      await account.invoke(multisig, "submit_transaction", payload);
      let txIndex =
        Number((await multisig.call("get_transactions_len")).res) - 1;
      await account.invoke(multisig, "confirm_transaction", {
        tx_index: txIndex,
      });

      try {
        await nonOwner.invoke(multisig, "execute_transaction", {
          tx_index: txIndex,
        });
        expect.fail("Should have failed");
      } catch (err: any) {
        assertErrorMsg(err.message, "not owner");
      }
    });

    it("executing a failing transaction fails", async function () {
      const selector = number.toBN(getSelectorFromName("revertFunc"));
      const target = number.toBN(targetContract.address);
      const payload = {
        to: target,
        function_selector: selector,
        calldata: [],
      };
      await account.invoke(multisig, "submit_transaction", payload);
      let txIndex =
        Number((await multisig.call("get_transactions_len")).res) - 1;
      await account.invoke(multisig, "confirm_transaction", {
        tx_index: txIndex,
      });

      try {
        await account.invoke(multisig, "execute_transaction", {
          tx_index: txIndex,
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
          tx_index: 600,
        });
        expect.fail("Should have failed");
      } catch (err: any) {
        assertErrorMsg(err.message, "tx does not exist");
      }
    });

    it("can't re-execute a transaction", async function () {
      const payload = defaultPayload(targetContract.address, 10);
      await account.invoke(multisig, "submit_transaction", payload);
      let txIndex =
        Number((await multisig.call("get_transactions_len")).res) - 1;
      await account.invoke(multisig, "confirm_transaction", {
        tx_index: txIndex,
      });

      await account.invoke(multisig, "execute_transaction", {
        tx_index: txIndex,
      });

      try {
        await account.invoke(multisig, "execute_transaction", {
          tx_index: txIndex,
        });
        expect.fail("Should have failed");
      } catch (err: any) {
        assertErrorMsg(err.message, "tx already executed");
      }
    });
  });
});

describe("Multisig with multiple owners", function () {
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
      owners: [
        number.toBN(account1.starknetContract.address),
        number.toBN(account2.starknetContract.address),
        number.toBN(account3.starknetContract.address),
      ],
      confirmations_required: 2,
    });

    targetFactory = await starknet.getContractFactory("Target");
    targetContract = await targetFactory.deploy();

    console.log("Deployment done");
    console.log("Account1: " + account1.starknetContract.address);
    console.log("Account2: " + account2.starknetContract.address);
    console.log("Account3: " + account3.starknetContract.address);
  });

  it("transaction execute works", async function () {
    const payload = defaultPayload(targetContract.address, 20);
    await account1.invoke(multisig, "submit_transaction", payload);
    let txIndex = Number((await multisig.call("get_transactions_len")).res) - 1;
    await account1.invoke(multisig, "confirm_transaction", {
      tx_index: txIndex,
    });
    await account2.invoke(multisig, "confirm_transaction", {
      tx_index: txIndex,
    });
    await account1.invoke(multisig, "execute_transaction", {
      tx_index: txIndex,
    });

    const bal = await targetContract.call("get_balance");
    expect(bal.res).to.equal(BigInt(20));
  });

  it("transaction execute works with too many confirmations", async function () {
    const payload = defaultPayload(targetContract.address, 21);
    await account1.invoke(multisig, "submit_transaction", payload);
    let txIndex = Number((await multisig.call("get_transactions_len")).res) - 1;
    await account1.invoke(multisig, "confirm_transaction", {
      tx_index: txIndex,
    });
    await account2.invoke(multisig, "confirm_transaction", {
      tx_index: txIndex,
    });
    await account3.invoke(multisig, "confirm_transaction", {
      tx_index: txIndex,
    });
    await account1.invoke(multisig, "execute_transaction", {
      tx_index: txIndex,
    });

    const bal = await targetContract.call("get_balance");
    expect(bal.res).to.equal(BigInt(21));
  });

  it("transaction execute works if superfluous confirmer revokes confirmation", async function () {
    const payload = defaultPayload(targetContract.address, 22);
    await account1.invoke(multisig, "submit_transaction", payload);
    let txIndex = Number((await multisig.call("get_transactions_len")).res) - 1;
    await account1.invoke(multisig, "confirm_transaction", {
      tx_index: txIndex,
    });
    await account2.invoke(multisig, "confirm_transaction", {
      tx_index: txIndex,
    });
    await account3.invoke(multisig, "confirm_transaction", {
      tx_index: txIndex,
    });
    await account2.invoke(multisig, "revoke_confirmation", {
      tx_index: txIndex,
    });
    await account1.invoke(multisig, "execute_transaction", {
      tx_index: txIndex,
    });

    const bal = await targetContract.call("get_balance");
    expect(bal.res).to.equal(BigInt(22));
  });

  it("transaction fails if too many revoke confirmation", async function () {
    const payload = defaultPayload(targetContract.address, 23);
    await account1.invoke(multisig, "submit_transaction", payload);
    let txIndex = Number((await multisig.call("get_transactions_len")).res) - 1;
    await account1.invoke(multisig, "confirm_transaction", {
      tx_index: txIndex,
    });
    await account2.invoke(multisig, "confirm_transaction", {
      tx_index: txIndex,
    });
    await account3.invoke(multisig, "confirm_transaction", {
      tx_index: txIndex,
    });
    await account2.invoke(multisig, "revoke_confirmation", {
      tx_index: txIndex,
    });
    await account1.invoke(multisig, "revoke_confirmation", {
      tx_index: txIndex,
    });

    try {
      await account3.invoke(multisig, "execute_transaction", {
        tx_index: txIndex,
      });
      expect.fail("Should have failed");
    } catch (err: any) {
      assertErrorMsg(err.message, "need more confirmations");
    }
  });
});

const defaultPayload = (contractAddress: string, newValue: number) => {
  const setSelector = number.toBN(getSelectorFromName("set_balance"));
  const target = number.toBN(contractAddress);
  const setPayload = {
    to: target,
    function_selector: setSelector,
    calldata: [newValue],
  };
  return setPayload;
};

const assertErrorMsg = (full: string, expected: string) => {
  expect(full).to.deep.contain("Transaction rejected. Error message:");
  const match = /Error message: (.+?)\n/.exec(full);
  if (match && match.length > 1) {
    expect(match[1]).to.equal(expected);
    return;
  }
  expect.fail("No expected error found: " + expected);
};
