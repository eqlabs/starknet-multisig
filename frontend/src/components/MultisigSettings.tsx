import {
  useStarknet,
  useStarknetCall,
  useStarknetInvoke,
  useStarknetTransactionManager,
} from "@starknet-react/core";
import React, { useEffect, useState } from "react";
import { useContractFactory } from "~/hooks/deploy";
import { useMultisigContract } from "~/hooks/multisigContractHook";
import MultisigSource from "../../public/MultiSig.json";
import TargetSource from "../../public/Target.json";
import {
  Abi,
  CompiledContract,
  Contract,
  ContractFactory,
  json,
  Provider,
} from "starknet";
import { number, stark } from "starknet";
import { useTargetContract } from "~/hooks/targetContractHook";

export function MultisigSettings() {
  const { account } = useStarknet();

  const [threshold, setThreshold] = useState<number>();
  const [totalAmount, setTotalAmount] = useState<number>(3);
  const [owners, setOwners] = useState<string[]>([]);
  const [deployedMultisigAddress, setDeployedMultisigAddress] =
    useState<string>("");
  const [deployedTargetAddress, setDeployedTargetAddress] =
    useState<string>("");
  const [deployedMultisigHash, setDeployedMultisigHash] = useState<string>("");
  const [deployedTargetHash, setDeployedTargetHash] = useState<string>("");
  const [targetBalance, setTargetBalance] = useState<number>(42);

  const [compiledMultisig, setCompiledMultisig] = useState<CompiledContract>();
  const [compiledTarget, setCompiledTarget] = useState<CompiledContract>();

  const { contract: multisigContract } = useMultisigContract(
    deployedMultisigAddress
  );
  const { contract: targetContract } = useTargetContract(deployedTargetAddress);

  const { deploy: deployMultisig } = useContractFactory({
    compiledContract: compiledMultisig,
    abi: MultisigSource.abi as Abi,
  });
  const { deploy: deployTarget } = useContractFactory({
    compiledContract: compiledTarget,
    abi: TargetSource.abi as Abi,
  });

  const {
    data: submitTransactionData,
    loading: submitTransactionLoading,
    error: submitTransactionError,
    invoke: submitTransaction,
  } = useStarknetInvoke({
    contract: multisigContract,
    method: "submit_transaction",
  });

  console.log(
    "data",
    submitTransactionData,
    submitTransactionError,
    submitTransactionLoading
  );

  const { invoke: confirmTransaction } = useStarknetInvoke({
    contract: multisigContract,
    method: "confirm_transaction",
  });

  const { invoke: executeTransaction } = useStarknetInvoke({
    contract: multisigContract,
    method: "execute_transaction",
  });

  const { data: multisigTransactionCount } = useStarknetCall({
    contract: multisigContract,
    method: "get_transactions_len",
    args: [],
  });

  useEffect(() => {
    if (!compiledMultisig) {
      getCompiledMultisig().then(setCompiledMultisig);
    }
    if (!compiledTarget) {
      getCompiledTarget().then(setCompiledTarget);
    }
  }, []);

  useEffect(() => {
    const emptyOwners = [...Array(totalAmount).keys()].map((item) => "");
    emptyOwners[0] = account ?? "";
    setOwners(emptyOwners);
  }, [totalAmount]);

  const getCompiledMultisig = async () => {
    // Can't import the JSON directly due to a bug in StarkNet: https://github.com/0xs34n/starknet.js/issues/104
    // (even if the issue is closed, the underlying Starknet issue remains)
    const raw = await fetch("/MultiSig.json");
    const compiled = json.parse(await raw.text());
    return compiled;
  };

  const getCompiledTarget = async () => {
    // Can't import the JSON directly due to a bug in StarkNet: https://github.com/0xs34n/starknet.js/issues/104
    // (even if the issue is closed, the underlying Starknet issue remains)
    const raw = await fetch("/Target.json");
    const compiled = json.parse(await raw.text());
    return compiled;
  };

  const onDeploy = async () => {
    const _deployMultisig = async () => {
      const bnOwners = owners.map((o) => number.toBN(o));
      const deployment = await deployMultisig({
        constructorCalldata: [bnOwners.length, ...bnOwners, threshold],
      });
      if (deployment) {
        setDeployedMultisigAddress(deployment.address);
        if (deployment.deployTransactionHash) {
          setDeployedMultisigHash(deployment.deployTransactionHash);
        }
      }
    };
    const _deployTarget = async () => {
      const deployment = await deployTarget({
        constructorCalldata: [],
      });
      if (deployment) {
        setDeployedTargetAddress(deployment.address);
        if (deployment.deployTransactionHash) {
          setDeployedTargetHash(deployment.deployTransactionHash);
        }
      }
    };
    await _deployTarget();
    await _deployMultisig();
  };

  const latestTxIndex = number.toBN(multisigTransactionCount).toNumber() - 1;

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
        [9],
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
          <option value="3">3</option>
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
        <button onClick={onDeploy}>Deploy multisig</button>
        <div>
          <div>
            Multisig contract address: {deployedMultisigAddress} with tx hash:{" "}
            {deployedMultisigHash}
          </div>
          <div>
            Target contract address: {deployedTargetAddress} with tx hash:{" "}
            {deployedTargetHash}
          </div>
        </div>
      </div>
      {/* <button onClick={() => invoke({ args: ["0x1"] })}>Send</button> */}
      <div>
        {multisigContract && targetContract && (
          <div>
            <div>
              Target balance:{" "}
              <input
                type="text"
                value={targetBalance}
                onChange={(e) => setTargetBalance(+e.target.value)}
              ></input>
              <button onClick={submit}>
                Submit a new transaction to change the balance
              </button>
            </div>

            {multisigTransactionCount && +multisigTransactionCount > 0 && (
              <span>
                <button onClick={confirm}>
                  Confirm the latest transaction
                </button>
                <button onClick={execute}>
                  Execute the latest transaction
                </button>
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
