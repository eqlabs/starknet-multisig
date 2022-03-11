import { expect } from "chai";
import { BigNumber } from "ethers";
import { starknet } from "hardhat";
import { StarknetContract, StarknetContractFactory, Account } from "hardhat/types/runtime";
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

  before(async function() {
    account = await starknet.deployAccountFromABI("Account", "OpenZeppelin");
    accountAddress = account.starknetContract.address;
    privateKey = account.privateKey;
    publicKey = account.publicKey;

    let multisigFactory = await starknet.getContractFactory("MultiSig");
    multisig = await multisigFactory.deploy({ 
      owners: [number.toBN(accountAddress)],
      confirmations_required: 1
     });

    contractFactory = await starknet.getContractFactory("contract");
    console.log("Started deployment");
    contract = await contractFactory.deploy({ initial_balance: 0 });
    
    console.log("Deployed at", contract.address);


    console.log("Deployed account at address:", account.starknetContract.address);
    console.log("Private and public key:", privateKey, publicKey);
  });

  it("transaction submit works", async function() {
    const selector = stark.getSelectorFromName("increase_balance");
    const payload = { 
      to: number.toBN(contract.address),
      function_selector: number.toBN(selector),
      calldata: [5]
    };
    await account.invoke(multisig, "submit_transaction", payload);
    await account.invoke(multisig, "get_transactions_len", {});

    await account.invoke(multisig, "confirm_transaction", { tx_index: 0n });
    console.log('starting execute');
    const res3 = await account.invoke(multisig, "execute_transaction", { tx_index: 0n });
  });

  

/* 
  it("should load an already deployed account with the correct private key", async function() {

    const loadedAccount = await starknet.getAccountFromAddress("Account", accountAddress, privateKey, "OpenZeppelin");

    expect(loadedAccount.starknetContract.address).to.deep.equal(accountAddress);
    expect(loadedAccount.privateKey).to.deep.equal(privateKey);
    expect(loadedAccount.publicKey).to.deep.equal(publicKey);
  });

  it("should fail when loading an already deployed account with a wrong private key", async function() {
    try{
      await starknet.getAccountFromAddress("Account" , accountAddress, "0x0123", "OpenZeppelin");
      expect.fail("Should have failed on passing an incorrect private key.");
    } catch(err: any) {
      expect(err.message).to.equal("The provided private key is not compatible with the public key stored in the contract.");
    }
  });

  it("should invoke a function on another contract", async function() {
    const { res: currBalance } = await account.call(contract, "get_balance");
    const amount1 = 10n;
    const amount2 = 20n;
    await account.invoke(contract, "increase_balance", { amount1, amount2 });

    const { res: newBalance } = await account.call(contract, "get_balance");
    expect(newBalance).to.deep.equal(currBalance + amount1 + amount2);
  });

  it("should work with arrays through an account", async function() {
    const { res } = await account.call(contract, "sum_array", { a: [1, 2, 3] });
    expect(res).to.equal(6n);
  });

  it("should work with BigNumbers and tuples through an account", async function() {
    // passing Points (1, 2) and (3, 4) in a tuple
    const { res: sum } = await account.call(contract, "sum_points_to_tuple", {
      points: [
        { x: BigNumber.from(1), y: BigNumber.from(2) },
        { x: 3, y: 4 }
      ]
    });
    expect(sum).to.deep.equal([4n, 6n]);
  }); */

});
