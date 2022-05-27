import { useContract } from "@starknet-react/core";
import { useEffect, useState } from "react";
import { Abi, Contract } from "starknet";
import { getSelectorFromName } from "starknet/dist/utils/hash";
import { toBN } from "starknet/dist/utils/number";
import { useMultisigTransactions } from "~/hooks/transactions";
import { filterNonFeltChars, shortStringFeltToStr } from "~/utils";
import Source from "../../public/erc20.json";
import Button from "./Button";
import { Field, Fieldset, Label } from "./Forms";
import { Input } from "./Input";

const Erc20Transaction = ({multisigContract}: {multisigContract?: Contract}) => {
  const { submitTransaction } = useMultisigTransactions(multisigContract)

  const [targetAddress, setTargetAddress] = useState<string>("");
  const [targetFunctionName, setTargetFunctionName] = useState<string>("");
  const [targetFunctionSelector, setTargetFunctionSelector] =
    useState<string>("");
  const [targetParameters, setTargetParameters] = useState<string>("");

  const [symbol, setSymbol] = useState<string>("");

  const { contract: targetContract } = useContract({
    abi: Source.abi as Abi,
    address: targetAddress,
  });

  useEffect(() => {
    if (targetFunctionName) {
      const newSelector = toBN(getSelectorFromName(targetFunctionName));
      setTargetFunctionSelector(newSelector);
    }
  }, [targetFunctionName]);

  const submit = async () => {
    const bigNumberizedParameters = targetParameters.split(" ").map((p) => toBN(p));

    await submitTransaction({
      args: [targetAddress, targetFunctionSelector, bigNumberizedParameters],
    });
  };

  useEffect(() => {
    const fetchTokenInfo = async () => {
      const symbol = await targetContract?.symbol();
      if (symbol) {
        setSymbol(shortStringFeltToStr(toBN(filterNonFeltChars(symbol.toString()))));
      }
    };
    fetchTokenInfo();
  }, [targetContract])

  return (
    <Fieldset>
      {/* TODO: Use a combobox for this field to give suggestions of deployed tokens */}
      <Field>
        <Label>Target contract address:</Label>
        <Input
          type="text"
          value={targetAddress}
          onChange={(e) => setTargetAddress(e.target.value)}
        ></Input>
      </Field>

      <div>{symbol}</div>

      <Field>
        <Label>Receiver:</Label>
        <Input
          type="text"
          value={targetFunctionName}
          onChange={(e) => setTargetFunctionName(e.target.value)}
        ></Input>
      </Field>

      <Field>
        <Label>Amount:</Label>
        <Input
          type="text"
          value={targetParameters}
          onChange={(e) => setTargetParameters(e.target.value)}
        ></Input>
      </Field>

      <Button fullWidth onClick={submit}>Submit a new transaction</Button>
    </Fieldset>
  )
}

export default Erc20Transaction
