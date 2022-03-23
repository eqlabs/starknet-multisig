import {
  useStarknet,
  useStarknetCall,
  useStarknetInvoke,
} from "@starknet-react/core";
import React, { useEffect, useState } from "react";
import { useContractFactory } from "~/hooks/deploy";
import { useMultisigContract } from "~/hooks/multisigContractHook";
import MultisigSource from "../contracts/MultiSig.json";
import TargetSource from "../contracts/Target.json";
import { Abi, CompiledContract, Contract } from "starknet";
const BN = require("bn.js");

export function MultisigSettings() {
  const { account } = useStarknet();

  const { contract: multisig } = useMultisigContract();

  const compiled = TargetSource as CompiledContract;
  const artifact = useContractFactory({
    compiledContract: compiled,
    abi: TargetSource.abi as Abi,
  });

  let waiting: Contract | undefined;
  const deploy = async () => {
    waiting = await artifact.deploy({
      constructorCalldata: [],
      //addressSalt: "",
    });
  };
  console.log("deploy", waiting);

  const {
    data: submitTransactionData,
    loading: submitTransactionLoading,
    error: submitTransactionError,
    reset,
    invoke: submitTransaction,
  } = useStarknetInvoke({ contract: multisig, method: "submit_transaction" });

  const { invoke: confirmTransaction } = useStarknetInvoke({
    contract: multisig,
    method: "confirm_transaction",
  });

  const { invoke: executeTransaction } = useStarknetInvoke({
    contract: multisig,
    method: "execute_transaction",
  });

  const { data: multisigTransactionCount } = useStarknetCall({
    contract: multisig,
    method: "get_transactions_len",
    args: [],
  });

  const latestTxIndex = new BN(multisigTransactionCount).toNumber() - 1;

  const [threshold, setThreshold] = useState<number>();
  const [totalAmount, setTotalAmount] = useState<number>(3);
  const [owners, setOwners] = useState<string[]>([]);

  useEffect(() => {
    const emptyOwners = [...Array(totalAmount).keys()].map((item) => "");
    emptyOwners[0] = account ?? "";
    setOwners(emptyOwners);
  }, [totalAmount]);

  const onThresholdChange = (value: string) => {
    setThreshold(+value);
  };

  const onTotalAmountChange = (value: string) => {
    setTotalAmount(+value);
  };

  const onOwnerChange = (value: string, index: number) => {
    const copy = [...owners];
    copy[index] = value;
    setOwners(copy);
  };

  const submit = async () => {
    await submitTransaction({
      args: [
        "0x05bac2320c9c3a5417d65f525f1e3de4602db12549a31386e5c9a2941853330a", // address of Target in alpha network
        "0x3a08f483ebe6c7533061acfc5f7c1746482621d16cff4c2c35824dec4181fa6", // selector of "set_balance" function
        [42],
      ],
    });
  };

  const confirm = async () => {
    await confirmTransaction({
      args: [latestTxIndex],
    });
  };

  const execute = async () => {
    await executeTransaction({
      args: [latestTxIndex],
    });
  };

  return (
    <div>
      <div>
        Threshold:{" "}
        <select
          onChange={(e) => {
            onThresholdChange(e.target.value);
          }}
          value={threshold}
        >
          <option value="1">1</option>
          <option value="2">2</option>
        </select>
        Total:{" "}
        <select
          onChange={(e) => {
            onTotalAmountChange(e.target.value);
          }}
          value={totalAmount}
        >
          <option value="1">1</option>
          <option value="2">2</option>
          <option value="3">3</option>
        </select>
      </div>
      <div>
        {owners.map((owner, i) => {
          return (
            <div key={i}>
              Owner {i + 1} address:
              <input
                type="text"
                onChange={(e) => onOwnerChange(e.target.value, i)}
                value={owner}
              ></input>
            </div>
          );
        })}
        <button onClick={deploy}>Deploy multisig</button>
      </div>
      {/* <button onClick={() => invoke({ args: ["0x1"] })}>Send</button> */}
      <div>
        <div>
          Multisig transaction count: {multisigTransactionCount?.toString()}
        </div>
        <div>
          <button onClick={submit}>Submit a new transaction</button>
          <button onClick={confirm}>Confirm the latest transaction</button>
          <button onClick={execute}>Execute the latest transaction</button>
        </div>
      </div>
    </div>
  );
}
