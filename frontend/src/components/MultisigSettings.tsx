import {
  useStarknet,
  useStarknetCall,
  useStarknetInvoke,
  useStarknetTransactionManager,
} from "@starknet-react/core";
import React, { useEffect, useState } from "react";
import { useContractFactory } from "~/hooks/deploy";
import { useMultisigContract } from "~/hooks/multisigContractHook";
import MultisigSource from "../../public/Multisig.json";
import {
  Abi,
  CompiledContract,
  Contract,
  ContractFactory,
  json,
  Provider,
} from "starknet";
import { number, stark } from "starknet";
import { getSelectorFromName, starknetKeccak } from "starknet/dist/utils/hash";

export function MultisigSettings() {
  const { account } = useStarknet();

  const [createNewMultisig, setCreateNewMultisig] = useState<boolean>(true);
  const [threshold, setThreshold] = useState<number>(2);
  const [totalAmount, setTotalAmount] = useState<number>(3);
  const [owners, setOwners] = useState<string[]>([]);
  const [deployedMultisigAddress, setDeployedMultisigAddress] =
    useState<string>("");
  const [targetAddress, setTargetAddress] = useState<string>("");
  const [targetFunctionName, setTargetFunctionName] = useState<string>("");
  const [targetFunctionSelector, setTargetFunctionSelector] =
    useState<string>("");
  const [targetParameters, setTargetParameters] = useState<string>("");

  const [compiledMultisig, setCompiledMultisig] = useState<CompiledContract>();

  const { contract: multisigContract } = useMultisigContract(
    deployedMultisigAddress
  );

  const { deploy: deployMultisig } = useContractFactory({
    compiledContract: compiledMultisig,
    abi: (MultisigSource as any).abi as Abi,
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

  const { data: multisigLatestTransaction } = useStarknetCall({
    contract: multisigContract,
    method: "get_transaction",
    args: [latestTxIndex],
  });

  let latestTxTarget = "";
  let latestTxFunction = "";
  let latestTxArgs = "";
  let latestTxConfirmation = 0;

  if (multisigLatestTransaction) {
    const tx = multisigLatestTransaction as any;
    latestTxTarget = number.toHex(tx.tx.to).toString();
    latestTxFunction = tx.tx.function_selector.toString();
    latestTxArgs = tx.tx_calldata.toString().replaceAll(",", " ");
    console.log("lat", tx);
    latestTxConfirmation = number
      .toBN((multisigLatestTransaction as any).tx.num_confirmations)
      .toNumber();
  }

  useEffect(() => {
    if (!compiledMultisig) {
      getCompiledMultisig().then(setCompiledMultisig);
    }
  }, []);

  useEffect(() => {
    if (targetFunctionName) {
      const newSelector = number.toBN(getSelectorFromName(targetFunctionName));
      setTargetFunctionSelector(newSelector);
    }
  }, [targetFunctionName]);

  useEffect(() => {
    const emptyOwners = [...Array(totalAmount).keys()].map((item) => "");
    emptyOwners[0] = account ?? "";
    setOwners(emptyOwners);
  }, [totalAmount, account]);

  const getCompiledMultisig = async () => {
    // Can't import the JSON directly due to a bug in StarkNet: https://github.com/0xs34n/starknet.js/issues/104
    // (even if the issue is closed, the underlying Starknet issue remains)
    const raw = await fetch("/Multisig.json");
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
    const pars = targetParameters.split(" ").map((p) => number.toBN(p));
    console.log(
      "submit",
      targetAddress,
      targetFunctionSelector.toString(),
      targetParameters,
      [targetParameters],
      pars
    );
    await submitTransaction({
      args: [targetAddress, targetFunctionSelector, pars],
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
  const targetLink = "https://goerli.voyager.online/contract/" + targetAddress;

  return (
    <div>
      <div>
        <input
          type="radio"
          checked={createNewMultisig}
          onChange={() => {
            setCreateNewMultisig(true);
            setDeployedMultisigAddress("");
          }}
        ></input>{" "}
        Create a new multisig
        <input
          type="radio"
          checked={!createNewMultisig}
          onChange={() => setCreateNewMultisig(false)}
        ></input>{" "}
        Use an existing multisig
      </div>
      {createNewMultisig && (
        <fieldset>
          <legend>Multisig creation</legend>
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
          <div></div>
          <button onClick={onDeploy}>Deploy multisig contract</button>
        </fieldset>
      )}
      {!createNewMultisig && (
        <div>
          Existing multisig contract address:{" "}
          <input
            type="text"
            onChange={(e) => setDeployedMultisigAddress(e.target.value)}
          ></input>
        </div>
      )}

      <div>
        {deployedMultisigAddress && (
          <div>
            Multisig contract:{" "}
            <a href={multisigLink} target="_blank">
              {deployedMultisigAddress}
            </a>
          </div>
        )}
      </div>
      <div>
        {deployedMultisigAddress && (
          <div>
            <div>
              <fieldset>
                <legend>Transaction creation</legend>
                <div>
                  Target contract address:{" "}
                  <input
                    type="text"
                    value={targetAddress}
                    onChange={(e) => setTargetAddress(e.target.value)}
                  ></input>{" "}
                  {targetAddress && (
                    <a href={targetLink} target="_blank">
                      Voyager link
                    </a>
                  )}
                </div>
                <div>
                  Target function name:{" "}
                  <input
                    type="text"
                    value={targetFunctionName}
                    onChange={(e) => setTargetFunctionName(e.target.value)}
                  ></input>
                </div>
                <div>
                  Target function parameters:{" "}
                  <input
                    type="text"
                    value={targetParameters}
                    onChange={(e) => setTargetParameters(e.target.value)}
                  ></input>
                </div>
                <button onClick={submit}>Submit a new transaction</button>
              </fieldset>

              {multisigTransactionCount && +multisigTransactionCount > 0 && (
                <div>
                  <div>
                    <div>
                      <fieldset>
                        <legend>Latest multisig transaction's data</legend>

                        <div>
                          Number of confirmations: {latestTxConfirmation}
                        </div>
                        <div>Target contract address:: {latestTxTarget}</div>
                        <div>Target function selector: {latestTxFunction}</div>
                        <div>Target function arguments: {latestTxArgs}</div>
                      </fieldset>
                    </div>
                  </div>
                  <button onClick={confirm}>
                    Confirm the latest transaction
                  </button>
                  <button onClick={execute}>
                    Execute the latest transaction
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
