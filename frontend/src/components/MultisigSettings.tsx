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

  const [threshold, setThreshold] = useState<number>(1);
  const [totalAmount, setTotalAmount] = useState<number>(3);
  const [owners, setOwners] = useState<string[]>([]);
  const [deployedMultisigAddress, setDeployedMultisigAddress] =
    useState<string>("");
  const [deployedTargetAddress, setDeployedTargetAddress] =
    useState<string>("");
  const [targetBalance, setTargetBalance] = useState<number>(42);

  const [compiledMultisig, setCompiledMultisig] = useState<CompiledContract>();
  const [compiledTarget, setCompiledTarget] = useState<CompiledContract>();

  const { contract: multisigContract } = useMultisigContract(
    deployedMultisigAddress
  );
  const { contract: targetContract } = useTargetContract(deployedTargetAddress);

  const { deploy: deployMultisig } = useContractFactory({
    compiledContract: compiledMultisig,
    abi: (MultisigSource as any).abi as Abi,
  });
  const { deploy: deployTarget } = useContractFactory({
    compiledContract: compiledTarget,
    abi: TargetSource.abi as any as Abi,
  });

  const { invoke: submitTransaction } = useStarknetInvoke({
    contract: multisigContract,
    method: "submit_transaction",
  });

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

  const latestTxIndex = number.toBN(multisigTransactionCount).toNumber() - 1;
  let confirmations = 0;

  const { data: multisigLatestTransaction } = useStarknetCall({
    contract: multisigContract,
    method: "get_transaction",
    args: [latestTxIndex],
  });

  if (multisigLatestTransaction) {
    confirmations = number
      .toBN((multisigLatestTransaction as any).tx.num_confirmations)
      .toNumber();
  }
  const { data: targetRetrievedBalance } = useStarknetCall({
    contract: targetContract,
    method: "get_balance",
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
  }, [totalAmount, account]);

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
      const calldata = [bnOwners.length, ...bnOwners, threshold];
      //console.log("deploy c", calldata);
      const deployment = await deployMultisig({
        constructorCalldata: calldata,
      });
      if (deployment) {
        setDeployedMultisigAddress(deployment.address);
      }
    };
    const _deployTarget = async () => {
      const deployment = await deployTarget({
        constructorCalldata: [],
      });
      if (deployment) {
        setDeployedTargetAddress(deployment.address);
      }
    };
    await _deployTarget();
    await _deployMultisig();
  };

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
        deployedTargetAddress, // address of Target in alpha network
        "0x3a08f483ebe6c7533061acfc5f7c1746482621d16cff4c2c35824dec4181fa6", // selector of "set_balance" function
        [targetBalance],
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

  const multisigLink =
    "https://goerli.voyager.online/contract/" + deployedMultisigAddress;
  const targetLink =
    "https://goerli.voyager.online/contract/" + deployedTargetAddress;

  return (
    <div>
      <div>
        Multisig threshold:{" "}
        <select
          onChange={(e) => {
            onThresholdChange(e.target.value);
          }}
          value={threshold}
        >
          <option value="1">1</option>
          <option value="2">2</option>
          <option value="3">3</option>
        </select>{" "}
        of total:{" "}
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
              Signer {i + 1} address:
              <input
                type="text"
                onChange={(e) => onOwnerChange(e.target.value, i)}
                value={owner}
              ></input>
            </div>
          );
        })}
        <button onClick={onDeploy}>Deploy multisig and Target contract</button>
        <div>
          {deployedMultisigAddress && (
            <div>
              Multisig contract:
              <a href={multisigLink} target="_blank">
                {deployedMultisigAddress}
              </a>
            </div>
          )}
          {deployedTargetAddress && (
            <div>
              Target contract
              <a href={targetLink} target="_blank">
                {deployedTargetAddress}
              </a>
            </div>
          )}
        </div>
      </div>
      <div>
        {multisigContract && targetContract && (
          <div>
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
                <div>
                  <div>Number of confirmations: {confirmations}</div>
                  <button onClick={confirm}>
                    Confirm the latest transaction
                  </button>
                  <button onClick={execute}>
                    Execute the latest transaction
                  </button>
                </div>
              )}
            </div>
            {multisigTransactionCount && (
              <div>
                Current balance in Target contract:{" "}
                {number.toBN(targetRetrievedBalance).toNumber()}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
