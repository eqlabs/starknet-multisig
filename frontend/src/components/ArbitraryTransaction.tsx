import { useEffect, useState } from "react";
import { Contract } from "starknet";
import { getSelectorFromName } from "starknet/dist/utils/hash";
import { toBN } from "starknet/dist/utils/number";
import Button from "./Button";
import { Field, Fieldset, Label } from "./Forms";
import { Input } from "./Input";

const ArbitraryTransaction = ({multisigContract}: {multisigContract?: Contract}) => {
  const [targetAddress, setTargetAddress] = useState<string>("");
  const [targetFunctionName, setTargetFunctionName] = useState<string>("");
  const [targetFunctionSelector, setTargetFunctionSelector] =
    useState<string>("");
  const [targetParameters, setTargetParameters] = useState<string>("");

  useEffect(() => {
    if (targetFunctionName) {
      const newSelector = toBN(getSelectorFromName(targetFunctionName));
      setTargetFunctionSelector(newSelector);
    }
  }, [targetFunctionName]);

  const submit = async () => {
    if (multisigContract) {
      const bigNumberizedParameters = targetParameters.split(" ").map((p) => toBN(p));
      const { res: nonce } = await multisigContract.get_transactions_len();
      await multisigContract.submit_transaction(targetAddress, targetFunctionSelector, bigNumberizedParameters,  nonce);
    }
  };

  return (
    <Fieldset>
      <Field>
        <Label>Target contract address:</Label>
        <Input
          type="text"
          value={targetAddress}
          onChange={(e) => setTargetAddress(e.target.value)}
        ></Input>
      </Field>

      <Field>
        <Label>Target function name:</Label>
        <Input
          type="text"
          value={targetFunctionName}
          onChange={(e) => setTargetFunctionName(e.target.value)}
        ></Input>
      </Field>

      <Field>
        <Label>Target function parameters:</Label>
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

export default ArbitraryTransaction
