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
      const txIndex = Number((await multisig.call("get_transactions_len")).res);

      const selector = number.toBN(getSelectorFromName("set_balance"));
      const target = number.toBN(targetContract.address);
      const payload = {
        to: target,
        function_selector: selector,
        calldata: [5],
        tx_index: txIndex,
      };

      await account.invoke(multisig, "submit_transaction", payload);
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
      const txIndex = Number((await multisig.call("get_transactions_len")).res);

      const payload = defaultPayload(targetContract.address, 6, txIndex);
      await account.invoke(multisig, "submit_transaction", payload);
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
      let txIndex = Number((await multisig.call("get_transactions_len")).res);

      let payload = defaultPayload(targetContract.address, 7, txIndex);
      await account.invoke(multisig, "submit_transaction", payload);

      await account.invoke(multisig, "confirm_transaction", {
        tx_index: txIndex,
      });
      await account.invoke(multisig, "execute_transaction", {
        tx_index: txIndex,
      });

      // submit another transaction with the same multisig
      txIndex = Number((await multisig.call("get_transactions_len")).res);
      payload = defaultPayload(targetContract.address, 8, txIndex);

      await account.invoke(multisig, "submit_transaction", payload);
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
      const txIndex = Number((await multisig.call("get_transactions_len")).res);

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
        tx_index: txIndex,
      };

      await account.invoke(multisig, "submit_transaction", payload);
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
      const txIndex = Number((await multisig.call("get_transactions_len")).res);
      const payload = defaultPayload(targetContract.address, 9, txIndex);

      await account.invoke(multisig, "submit_transaction", payload);
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
      const txIndex = Number((await multisig.call("get_transactions_len")).res);
      const payload = defaultPayload(targetContract.address, 10, txIndex);

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
      const txIndex = Number((await multisig.call("get_transactions_len")).res);
      const payload = defaultPayload(targetContract.address, 15, txIndex);

      await account.invoke(multisig, "submit_transaction", payload);
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
      const txIndex = Number((await multisig.call("get_transactions_len")).res);
      const payload = defaultPayload(targetContract.address, 16, txIndex);

      await account.invoke(multisig, "submit_transaction", payload);
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
      const txIndex = Number((await multisig.call("get_transactions_len")).res);
      const payload = defaultPayload(targetContract.address, 10, txIndex);

      await account.invoke(multisig, "submit_transaction", payload);
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
      const txIndex = Number((await multisig.call("get_transactions_len")).res);
      const payload = defaultPayload(targetContract.address, 10, txIndex);

      await account.invoke(multisig, "submit_transaction", payload);
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
      const txIndex = Number((await multisig.call("get_transactions_len")).res);
      const payload = defaultPayload(targetContract.address, 10, txIndex);

      await account.invoke(multisig, "submit_transaction", payload);
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
      const txIndex = Number((await multisig.call("get_transactions_len")).res);
      const payload = defaultPayload(targetContract.address, 10, txIndex);

      await account.invoke(multisig, "submit_transaction", payload);
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
      const txIndex = Number((await multisig.call("get_transactions_len")).res);
      const payload = defaultPayload(targetContract.address, 10, txIndex);

      await account.invoke(multisig, "submit_transaction", payload);
      await account.invoke(multisig, "confirm_transaction", {
        tx_index: txIndex,
      });

      await nonOwner.invoke(multisig, "execute_transaction", {
        tx_index: txIndex,
      });
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
      const txIndex = Number((await multisig.call("get_transactions_len")).res);
      const payload = defaultPayload(targetContract.address, 10, txIndex);

      await account.invoke(multisig, "submit_transaction", payload);
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
    const txIndex = Number((await multisig.call("get_transactions_len")).res);
    const payload = defaultPayload(targetContract.address, 20, txIndex);

    await account1.invoke(multisig, "submit_transaction", payload);
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
    const txIndex = Number((await multisig.call("get_transactions_len")).res);
    const payload = defaultPayload(targetContract.address, 21, txIndex);

    await account1.invoke(multisig, "submit_transaction", payload);
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
    const txIndex = Number((await multisig.call("get_transactions_len")).res);
    const payload = defaultPayload(targetContract.address, 22, txIndex);

    await account1.invoke(multisig, "submit_transaction", payload);
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
    const txIndex = Number((await multisig.call("get_transactions_len")).res);
    const payload = defaultPayload(targetContract.address, 23, txIndex);

    await account1.invoke(multisig, "submit_transaction", payload);
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

  // Tests below are interdependent and shall be run sequentially
  it("transaction sets new owners", async function () {
    const txIndex = Number((await multisig.call("get_transactions_len")).res);

    const selector = getSelectorFromName("set_owners");
    const newOwners = [
      number.toBN(account2.starknetContract.address),
      number.toBN(account3.starknetContract.address),
    ];
    const payload = {
      to: number.toBN(multisig.address),
      function_selector: number.toBN(selector),
      calldata: [newOwners.length, ...newOwners],
      tx_index: txIndex,
    };

    await account1.invoke(multisig, "submit_transaction", payload);

    await account1.invoke(multisig, "confirm_transaction", {
      tx_index: txIndex,
    });
    await account3.invoke(multisig, "confirm_transaction", {
      tx_index: txIndex,
    });

    await account1.invoke(multisig, "execute_transaction", {
      tx_index: txIndex,
    });

    const res = await account2.call(multisig, "get_owners");
    expect(res.owners_len).to.equal(2n);
    expect(res.owners.map((address: any) => address.toString())).to.eql(
      newOwners.map((address) => address.toString())
    );
  });

  it("set single owner thus lowering required confirmations", async function () {
    const txIndex = Number((await multisig.call("get_transactions_len")).res);

    const selector = getSelectorFromName("set_owners");
    const newOwners = [number.toBN(account2.starknetContract.address)];
    const payload = {
      to: number.toBN(multisig.address),
      function_selector: number.toBN(selector),
      calldata: [newOwners.length, ...newOwners],
      tx_index: txIndex,
    };

    await account2.invoke(multisig, "submit_transaction", payload);

    await account2.invoke(multisig, "confirm_transaction", {
      tx_index: txIndex,
    });
    await account3.invoke(multisig, "confirm_transaction", {
      tx_index: txIndex,
    });

    await account2.invoke(multisig, "execute_transaction", {
      tx_index: txIndex,
    });

    const res = await account2.call(multisig, "get_owners");
    expect(res.owners_len).to.equal(1n);
    expect(res.owners.map((address: any) => address.toString())).to.eql(
      newOwners.map((address) => address.toString())
    );
  });

  it("invalidate previous transactions with set owners", async function () {
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
    const txIndex = Number((await multisig.call("get_transactions_len")).res);
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
      tx_index: txIndex,
    };

    await account2.invoke(multisig, "submit_transaction", payload);

    await account1.invoke(multisig, "confirm_transaction", {
      tx_index: txIndex,
    });
    await account2.invoke(multisig, "confirm_transaction", {
      tx_index: txIndex,
    });

    try {
      await account2.invoke(multisig, "execute_transaction", {
        tx_index: txIndex,
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
    let txIndex = Number((await multisig.call("get_transactions_len")).res);
    const numOfOwners = 0;
    const selector = getSelectorFromName("set_owners");
    const payload = {
      to: number.toBN(multisig.address),
      function_selector: number.toBN(selector),
      calldata: [numOfOwners],
      tx_index: txIndex,
    };

    await account2.invoke(multisig, "submit_transaction", payload);

    await account2.invoke(multisig, "confirm_transaction", {
      tx_index: txIndex,
    });
    await account1.invoke(multisig, "confirm_transaction", {
      tx_index: txIndex,
    });

    // Execution shall be allowed from any account
    await account3.invoke(multisig, "execute_transaction", {
      tx_index: txIndex,
    });

    // No one shall be able to submit new transactions anymore
    try {
      const payload = defaultPayload(
        targetContract.address,
        txIndex * 2,
        ++txIndex
      );
      await account2.invoke(multisig, "submit_transaction", payload);
    } catch (err: any) {
      assertErrorMsg(err.message, "not owner");
    }
  });
});
