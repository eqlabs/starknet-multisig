import { expect } from "chai";
import { starknet } from "hardhat";
import {
  StarknetContract,
  StarknetContractFactory,
  Account,
} from "hardhat/types/runtime";
import { number } from "starknet";
import { getSelectorFromName } from "starknet/dist/utils/hash";
import { defaultPayload, assertErrorMsg } from "./utils";

const dumpFile = "test/unittest-dump.dmp";

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
    // account = await starknet.deployAccount("OpenZeppelin", { salt: (salt++).toString() });

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

    await starknet.devnet.dump(dumpFile);
    await new Promise((f) => setTimeout(f, 1000)); // to allow the dump to complete
  });

  beforeEach(async function () {
    await starknet.devnet.load(dumpFile);
  });

  describe(" - submit - ", function () {
    it("transaction submit works", async function () {
      const selector = number.toBN(getSelectorFromName("set_balance"));
      const target = number.toBN(targetContract.address);
      const payload = {
        to: target,
        function_selector: selector,
        calldata: [5],
        tx_index: 0,
      };

      await account.invoke(multisig, "submit_transaction", payload);
      const res = await multisig.call("get_transaction", {
        tx_index: 0,
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
      const payload = defaultPayload(targetContract.address, 6, 0);
      await account.invoke(multisig, "submit_transaction", payload);
      await account.invoke(multisig, "confirm_transaction", {
        tx_index: 0,
      });
      await account.invoke(multisig, "execute_transaction", {
        tx_index: 0,
      });

      const bal = await targetContract.call("get_balance");
      expect(bal.res).to.equal(BigInt(6));
    });

    it("transaction execute works for subsequent transactions", async function () {
      let payload = defaultPayload(targetContract.address, 7, 0);
      await account.invoke(multisig, "submit_transaction", payload);

      await account.invoke(multisig, "confirm_transaction", {
        tx_index: 0,
      });
      await account.invoke(multisig, "execute_transaction", {
        tx_index: 0,
      });

      // submit another transaction with the same multisig
      payload = defaultPayload(targetContract.address, 8, 1);

      await account.invoke(multisig, "submit_transaction", payload);
      await account.invoke(multisig, "confirm_transaction", {
        tx_index: 1,
      });
      await account.invoke(multisig, "execute_transaction", {
        tx_index: 1,
      });

      const bal = await targetContract.call("get_balance");
      expect(bal.res).to.equal(BigInt(8));
    });

    it("transactions can be confirmed and executed in any order", async function () {
      let txIndex = Number((await multisig.call("get_transactions_len")).res);
      let payload = defaultPayload(targetContract.address, 17, txIndex);
      await account.invoke(multisig, "submit_transaction", payload);
      const txIndex1 =
        Number((await multisig.call("get_transactions_len")).res) - 1;

      payload = defaultPayload(targetContract.address, 18, txIndex + 1);
      await account.invoke(multisig, "submit_transaction", payload);
      const txIndex2 =
        Number((await multisig.call("get_transactions_len")).res) - 1;

      payload = defaultPayload(targetContract.address, 19, txIndex + 2);
      await account.invoke(multisig, "submit_transaction", payload);
      const txIndex3 =
        Number((await multisig.call("get_transactions_len")).res) - 1;

      // confirm in any order (skip one)
      await account.invoke(multisig, "confirm_transaction", {
        tx_index: txIndex3,
      });
      await account.invoke(multisig, "confirm_transaction", {
        tx_index: txIndex1,
      });

      await account.invoke(multisig, "execute_transaction", {
        tx_index: txIndex3,
      });
      const bal3 = await targetContract.call("get_balance");

      // confirm also the one unconfirmed
      await account.invoke(multisig, "confirm_transaction", {
        tx_index: txIndex2,
      });

      await account.invoke(multisig, "execute_transaction", {
        tx_index: txIndex1,
      });
      const bal1 = await targetContract.call("get_balance");

      await account.invoke(multisig, "execute_transaction", {
        tx_index: txIndex2,
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
        tx_index: 0,
      };

      await account.invoke(multisig, "submit_transaction", payload);
      await account.invoke(multisig, "confirm_transaction", {
        tx_index: 0,
      });
      await account.invoke(multisig, "execute_transaction", {
        tx_index: 0,
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
          tx_index: 0,
        });
        expect.fail("Should have failed");
      } catch (err: any) {
        assertErrorMsg(err.message, "need more confirmations");
      }
    });

    it("non-owner can't submit a transaction", async function () {
      const payload = defaultPayload(targetContract.address, 10, 0);

      try {
        await nonOwner.invoke(multisig, "submit_transaction", payload);
        expect.fail("Should have failed");
      } catch (err: any) {
        assertErrorMsg(err.message, "not owner");
      }
    });

    it("executing a failing transaction fails", async function () {
      const selector = number.toBN(getSelectorFromName("revertFunc"));
      const txIndex = Number((await multisig.call("get_transactions_len")).res);
      const target = number.toBN(targetContract.address);
      const payload = {
        to: target,
        function_selector: selector,
        calldata: [],
        tx_index: txIndex,
      };
      await account.invoke(multisig, "submit_transaction", payload);

      await account.invoke(multisig, "confirm_transaction", {
        tx_index: txIndex,
      });

      try {
        await account.invoke(multisig, "execute_transaction", {
          tx_index: txIndex,
        });
        expect.fail("Should have failed");
      } catch (err: any) {
        assertGenericRevert(err.message);
      }
    });

    it("executing a transaction to a non-existing function fails", async function () {
      const selector = number.toBN(getSelectorFromName("nonExisting"));
      const txIndex = Number((await multisig.call("get_transactions_len")).res);
      const target = number.toBN(targetContract.address);
      const payload = {
        to: target,
        function_selector: selector,
        calldata: [],
        tx_index: txIndex,
      };
      await account.invoke(multisig, "submit_transaction", payload);
      await account.invoke(multisig, "confirm_transaction", {
        tx_index: txIndex,
      });

      try {
        await account.invoke(multisig, "execute_transaction", {
          tx_index: txIndex,
        });
        expect.fail("Should have failed");
      } catch (err: any) {
        assertGenericRevert(err.message);
      }
    });
  });

  describe("- confirmation - ", function () {
    it("non-owner can't confirm a transaction", async function () {
      const payload = defaultPayload(targetContract.address, 15, 0);

      await account.invoke(multisig, "submit_transaction", payload);
      try {
        await nonOwner.invoke(multisig, "confirm_transaction", {
          tx_index: 0,
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
      const payload = defaultPayload(targetContract.address, 16, 0);

      await account.invoke(multisig, "submit_transaction", payload);
      await account.invoke(multisig, "confirm_transaction", {
        tx_index: 0,
      });
      await account.invoke(multisig, "execute_transaction", {
        tx_index: 0,
      });

      try {
        await account.invoke(multisig, "confirm_transaction", {
          tx_index: 0,
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
        tx_index: 0,
      });

      try {
        await account.invoke(multisig, "confirm_transaction", {
          tx_index: 0,
        });
        expect.fail("Should have failed");
      } catch (err: any) {
        assertErrorMsg(err.message, "tx already confirmed");
      }
    });
  });

  describe("- revocation -", function () {
    it("non-owner can't revoke a confirmation", async function () {
      const payload = defaultPayload(targetContract.address, 10, 0);

      await account.invoke(multisig, "submit_transaction", payload);
      await account.invoke(multisig, "confirm_transaction", {
        tx_index: 0,
      });

      try {
        await nonOwner.invoke(multisig, "revoke_confirmation", {
          tx_index: 0,
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
      const payload = defaultPayload(targetContract.address, 10, 0);

      await account.invoke(multisig, "submit_transaction", payload);
      await account.invoke(multisig, "confirm_transaction", {
        tx_index: 0,
      });

      await account.invoke(multisig, "execute_transaction", {
        tx_index: 0,
      });

      try {
        await account.invoke(multisig, "revoke_confirmation", {
          tx_index: 0,
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
        tx_index: 0,
      });

      await account.invoke(multisig, "revoke_confirmation", {
        tx_index: 0,
      });

      try {
        await account.invoke(multisig, "revoke_confirmation", {
          tx_index: 0,
        });
        expect.fail("Should have failed");
      } catch (err: any) {
        assertErrorMsg(err.message, "tx not confirmed");
      }
    });
  });

  describe("- execution -", function () {
    it("non-owner can't execute a transaction", async function () {
      const payload = defaultPayload(targetContract.address, 10, 0);

      await account.invoke(multisig, "submit_transaction", payload);
      await account.invoke(multisig, "confirm_transaction", {
        tx_index: 0,
      });

      await nonOwner.invoke(multisig, "execute_transaction", {
        tx_index: 0,
      });
    });

    it("executing a failing transaction fails", async function () {
      const selector = number.toBN(getSelectorFromName("revertFunc"));
      const target = number.toBN(targetContract.address);
      const txIndex = Number((await multisig.call("get_transactions_len")).res);
      const payload = {
        to: target,
        function_selector: selector,
        calldata: [],
        tx_index: txIndex,
      };
      await account.invoke(multisig, "submit_transaction", payload);
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
      const payload = defaultPayload(targetContract.address, 10, 0);

      await account.invoke(multisig, "submit_transaction", payload);
      await account.invoke(multisig, "confirm_transaction", {
        tx_index: 0,
      });

      await account.invoke(multisig, "execute_transaction", {
        tx_index: 0,
      });

      try {
        await account.invoke(multisig, "execute_transaction", {
          tx_index: 0,
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

    await starknet.devnet.dump(dumpFile);
    await new Promise((f) => setTimeout(f, 1000)); // to allow the dump to complete
  });

  beforeEach(async function () {
    await starknet.devnet.load(dumpFile);
  });

  it("transaction execute works", async function () {
    const payload = defaultPayload(targetContract.address, 20, 0);

    await account1.invoke(multisig, "submit_transaction", payload);
    await account1.invoke(multisig, "confirm_transaction", {
      tx_index: 0,
    });
    await account2.invoke(multisig, "confirm_transaction", {
      tx_index: 0,
    });

    await account1.invoke(multisig, "execute_transaction", {
      tx_index: 0,
    });

    const bal = await targetContract.call("get_balance");
    expect(bal.res).to.equal(BigInt(20));
  });

  it("transaction execute works with too many confirmations", async function () {
    const payload = defaultPayload(targetContract.address, 21, 0);

    await account1.invoke(multisig, "submit_transaction", payload);
    await account1.invoke(multisig, "confirm_transaction", {
      tx_index: 0,
    });
    await account2.invoke(multisig, "confirm_transaction", {
      tx_index: 0,
    });
    await account3.invoke(multisig, "confirm_transaction", {
      tx_index: 0,
    });
    await account1.invoke(multisig, "execute_transaction", {
      tx_index: 0,
    });

    const bal = await targetContract.call("get_balance");
    expect(bal.res).to.equal(BigInt(21));
  });

  it("transaction execute works if superfluous confirmer revokes confirmation", async function () {
    const payload = defaultPayload(targetContract.address, 22, 0);

    await account1.invoke(multisig, "submit_transaction", payload);
    await account1.invoke(multisig, "confirm_transaction", {
      tx_index: 0,
    });
    await account2.invoke(multisig, "confirm_transaction", {
      tx_index: 0,
    });
    await account3.invoke(multisig, "confirm_transaction", {
      tx_index: 0,
    });
    await account2.invoke(multisig, "revoke_confirmation", {
      tx_index: 0,
    });
    await account1.invoke(multisig, "execute_transaction", {
      tx_index: 0,
    });

    const bal = await targetContract.call("get_balance");
    expect(bal.res).to.equal(BigInt(22));
  });

  it("transaction fails if too many revoke confirmation", async function () {
    const payload = defaultPayload(targetContract.address, 23, 0);

    await account1.invoke(multisig, "submit_transaction", payload);
    await account1.invoke(multisig, "confirm_transaction", {
      tx_index: 0,
    });
    await account2.invoke(multisig, "confirm_transaction", {
      tx_index: 0,
    });
    await account3.invoke(multisig, "confirm_transaction", {
      tx_index: 0,
    });
    await account2.invoke(multisig, "revoke_confirmation", {
      tx_index: 0,
    });
    await account1.invoke(multisig, "revoke_confirmation", {
      tx_index: 0,
    });

    try {
      await account3.invoke(multisig, "execute_transaction", {
        tx_index: 0,
      });
      expect.fail("Should have failed");
    } catch (err: any) {
      assertErrorMsg(err.message, "need more confirmations");
    }
  });

  // Tests below are interdependent and shall be run sequentially
  it("transaction sets new owners", async function () {
    const selector = getSelectorFromName("set_owners");
    const newOwners = [
      number.toBN(account2.starknetContract.address),
      number.toBN(account3.starknetContract.address),
    ];
    const payload = {
      to: number.toBN(multisig.address),
      function_selector: number.toBN(selector),
      calldata: [newOwners.length, ...newOwners],
      tx_index: 0,
    };

    await account1.invoke(multisig, "submit_transaction", payload);

    await account1.invoke(multisig, "confirm_transaction", {
      tx_index: 0,
    });
    await account3.invoke(multisig, "confirm_transaction", {
      tx_index: 0,
    });

    await account1.invoke(multisig, "execute_transaction", {
      tx_index: 0,
    });

    const res = await account2.call(multisig, "get_owners");
    expect(res.owners_len).to.equal(2n);
    expect(res.owners.map((address: any) => address.toString())).to.eql(
      newOwners.map((address) => address.toString())
    );
  });

  it("set single owner thus lowering required confirmations", async function () {
    const selector = getSelectorFromName("set_owners");
    const newOwners = [number.toBN(account2.starknetContract.address)];
    const payload = {
      to: number.toBN(multisig.address),
      function_selector: number.toBN(selector),
      calldata: [newOwners.length, ...newOwners],
      tx_index: 0,
    };

    await account2.invoke(multisig, "submit_transaction", payload);

    await account2.invoke(multisig, "confirm_transaction", {
      tx_index: 0,
    });
    await account3.invoke(multisig, "confirm_transaction", {
      tx_index: 0,
    });

    await account2.invoke(multisig, "execute_transaction", {
      tx_index: 0,
    });

    const res = await account2.call(multisig, "get_owners");
    expect(res.owners_len).to.equal(1n);
    expect(res.owners.map((address: any) => address.toString())).to.eql(
      newOwners.map((address) => address.toString())
    );
  });

  // FIXME
  xit("invalidate previous transactions with set owners", async function () {
    const numTxToSpawn = 5;
    for (let i = 0; i < numTxToSpawn; i++) {
      const txIndex = Number((await multisig.call("get_transactions_len")).res);
      const payload = defaultPayload(targetContract.address, 101 + i, txIndex);
      await account2.invoke(multisig, "submit_transaction", payload);
    }

    // Executed set_owners invalidates previous transactions
    const invalidatingTxIndex = Number(
      (await multisig.call("get_transactions_len")).res
    );
    const selector = getSelectorFromName(
      "set_owners_and_confirmations_required"
    );
    const newOwners = [
      number.toBN(account2.starknetContract.address),
      number.toBN(account1.starknetContract.address),
    ];
    const payload = {
      to: number.toBN(multisig.address),
      function_selector: number.toBN(selector),
      calldata: [
        newOwners.length,
        ...newOwners, // owners
        2, // confirmations_required
      ],
      tx_index: invalidatingTxIndex,
    };

    await account2.invoke(multisig, "submit_transaction", payload);

    await account2.invoke(multisig, "confirm_transaction", {
      tx_index: invalidatingTxIndex,
    });
    await account2.invoke(multisig, "execute_transaction", {
      tx_index: invalidatingTxIndex,
    });

    // try to confirm invalid transaction
    try {
      await account1.invoke(multisig, "confirm_transaction", {
        tx_index: invalidatingTxIndex - Math.round(numTxToSpawn / 2),
      });
      expect.fail("Should have failed");
    } catch (err: any) {
      assertErrorMsg(
        err.message,
        "tx invalidated: config changed after submission"
      );
    }

    {
      const res = await account1.call(multisig, "get_confirmations_required");
      expect(res.confirmations_required).to.equal(2n);
    }

    {
      const res = await account1.call(multisig, "get_owners");
      expect(res.owners_len).to.equal(2n);
      expect(res.owners.map((address: any) => address.toString())).to.eql(
        newOwners.map((address) => address.toString())
      );
    }
  });

  it("set invalid number of confirmations", async function () {
    const selector = getSelectorFromName(
      "set_owners_and_confirmations_required"
    );
    const newOwners = [
      number.toBN(account2.starknetContract.address),
      number.toBN(account3.starknetContract.address),
    ];
    const payload = {
      to: number.toBN(multisig.address),
      function_selector: number.toBN(selector),
      calldata: [
        newOwners.length,
        ...newOwners, // new owners
        3, // confirmations required
      ],
      tx_index: 0,
    };

    await account2.invoke(multisig, "submit_transaction", payload);

    await account1.invoke(multisig, "confirm_transaction", {
      tx_index: 0,
    });
    await account2.invoke(multisig, "confirm_transaction", {
      tx_index: 0,
    });

    try {
      await account2.invoke(multisig, "execute_transaction", {
        tx_index: 0,
      });
      expect.fail("Should have failed");
    } catch (err: any) {
      assertErrorMsg(err.message, "invalid parameters");
    }
  });

  it("deploy multisig with invalid confirmations number fails", async function () {
    const multisigFactory = await starknet.getContractFactory("Multisig");

    try {
      await multisigFactory.deploy({
        owners: [
          number.toBN(account1.starknetContract.address),
          number.toBN(account2.starknetContract.address),
          number.toBN(account3.starknetContract.address),
        ],
        confirmations_required: 4,
      });
      expect.fail("Should have failed");
    } catch (err: any) {
      assertErrorMsg(err.message, "invalid parameters");
    }
  });

  it("deploy multisig with empty owners fails", async function () {
    const multisigFactory = await starknet.getContractFactory("Multisig");

    try {
      await multisigFactory.deploy({
        owners: [],
        confirmations_required: 4,
      });
      expect.fail("Should have failed");
    } catch (err: any) {
      assertErrorMsg(err.message, "invalid parameters");
    }
  });

  it("non recursive call fails", async function () {
    try {
      const newOwners = [
        number.toBN(account2.starknetContract.address),
        number.toBN(account3.starknetContract.address),
      ];
      await account1.invoke(multisig, "set_owners", { owners: newOwners });

      expect.fail("Should have failed");
    } catch (err: any) {
      assertErrorMsg(err.message, "access restricted to multisig");
    }
  });

  it("set 0 owners", async () => {
    const numOfOwners = 0;
    const selector = getSelectorFromName("set_owners");
    const payload = {
      to: number.toBN(multisig.address),
      function_selector: number.toBN(selector),
      calldata: [numOfOwners],
      tx_index: 0,
    };

    await account2.invoke(multisig, "submit_transaction", payload);

    await account2.invoke(multisig, "confirm_transaction", {
      tx_index: 0,
    });
    await account1.invoke(multisig, "confirm_transaction", {
      tx_index: 0,
    });

    // Execution shall be allowed from any account
    await account3.invoke(multisig, "execute_transaction", {
      tx_index: 0,
    });

    // No one shall be able to submit new transactions anymore
    try {
      const payload = defaultPayload(targetContract.address, 66, 1);
      await account2.invoke(multisig, "submit_transaction", payload);
    } catch (err: any) {
      assertErrorMsg(err.message, "not owner");
    }
  });
});

// Checks that there is a generic revert. A generic revert is something which doesn't have an error message coming from code - for example the called function doesn't exist
const assertGenericRevert = (error: string) => {
  // Couldn't find anything precise in the error message to detect generic revert. These two are the best I could come up with
  // This is checked so that we know there's a problem in the "call_contract" part
  expect(error).to.deep.contain("call_contract");
  // I guess this is included in all error messages, but at least this checks that it's an execution error
  expect(error).to.deep.contain("Transaction rejected. Error message:");
};
