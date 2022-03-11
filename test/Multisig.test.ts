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

describe("Starknet", function () {
  this.timeout(900_000);

  let contractFactory: StarknetContractFactory;
  let contract: StarknetContract;
  let multisig: StarknetContract;

  let account: Account;
  let accountAddress: string;
  let privateKey: string;
  let publicKey: string;

  let txIndex = -1; // faster to track this internally, than to request from contract

  before(async function () {
    account = await starknet.deployAccount("OpenZeppelin");
    accountAddress = account.starknetContract.address;
    privateKey = account.privateKey;
    publicKey = account.publicKey;

    let multisigFactory = await starknet.getContractFactory("MultiSig");
    multisig = await multisigFactory.deploy({
      owners: [number.toBN(accountAddress)],
      confirmations_required: 1,
    });

    contractFactory = await starknet.getContractFactory("contract");
    console.log("Started deployment");
    contract = await contractFactory.deploy({ initial_balance: 0 });

    console.log("Deployed target contract at", contract.address);
    console.log(
      "Deployed account at address:",
      account.starknetContract.address
    );
    console.log("Private and public key:", privateKey, publicKey);
  });

  it("transaction submit works", async function () {
    txIndex++;

    const selector = number.toBN(stark.getSelectorFromName("set_balance"));
    const target = number.toBN(contract.address);
    const payload = {
      to: target,
      function_selector: selector,
      calldata: [5],
    };
    await account.invoke(multisig, "submit_transaction", payload);

    const res = await account.call(multisig, "get_transaction", {
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
    txIndex++;

    const setSelector = number.toBN(stark.getSelectorFromName("set_balance"));
    const target = number.toBN(contract.address);
    const setPayload = {
      to: target,
      function_selector: setSelector,
      calldata: [6],
    };
    await account.invoke(multisig, "submit_transaction", setPayload);
    await account.invoke(multisig, "confirm_transaction", {
      tx_index: txIndex,
    });
    await account.invoke(multisig, "execute_transaction", {
      tx_index: txIndex,
    });

    const bal = await contract.call("get_balance");
    expect(bal.res).to.equal(6n);
  });
});
