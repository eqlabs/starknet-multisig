import {
  CompiledContract,
  ContractFactory,
  defaultProvider,
  DeployContractPayload,
  json,
} from "starknet";
import * as fs from "fs";
import { number, stark } from "starknet";
import * as Multisig from "/home/laurip/src/eqlabs/starknet-multisig/contracts/starknet-artifacts/contracts/MultiSig.cairo/MultiSig.json";
//"../starknet-artifacts/contracts/MultiSig.cairo/MultiSig.json";

const num = number.toBN(
  "0x0559696814f4bb15744dfcb98330f8db2f26e02706fbf8ae11b985995abd9ee7"
);

const doit = async () => {
  /*   const raw = fs
    .readFileSync(
      __dirname +
        "/../starknet-artifacts/contracts/MultiSig.cairo/MultiSig.json"
    )
    .toString("ascii");
  const compiledErc20 = json.parse(raw); */

  const compiled = Multisig as CompiledContract;
  //console.log("contract len", json.stringify(compiled).length);
  //return;

  /*const obj: DeployContractPayload = {
    contract: compiled,
    constructorCalldata: [1, num],
  };

   const erc20Response = await defaultProvider.deployContract(
    obj,
    compiledErc20.abi
  ); */

  const fact = new ContractFactory(compiled, defaultProvider, compiled.abi);
  const factDeploy = await fact.deploy([1, num]);

  /* console.log(
    "Waiting for Tx to be Accepted on Starknet - ERC20 Deployment...",
    erc20Response
  ); */
  if (factDeploy.deployTransactionHash) {
    console.log("waiting for fact");
    await defaultProvider.waitForTransaction(factDeploy.deployTransactionHash);

    const status = await defaultProvider.getTransactionStatus(
      factDeploy.deployTransactionHash
    );
    console.log("second", status, factDeploy.address);
  }

  //await defaultProvider.waitForTransaction(erc20Response.transaction_hash);
};

doit().then((a) => {
  console.log("waiting", a);
});
