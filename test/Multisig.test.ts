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
    account = await starknet.deployAccount("OpenZeppelin");
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
    
    console.log("Deployed target contract at", contract.address);
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

    await account.invoke(multisig, "confirm_transaction", { tx_index: 0n });
    console.log('starting execute');
    const res3 = await account.invoke(multisig, "execute_transaction", { tx_index: 0n });
  });
});
