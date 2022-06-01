import { useState } from "react";
import { Contract } from "starknet";
import { getSelectorFromName } from "starknet/dist/utils/hash";
import { toBN } from "starknet/dist/utils/number";
import Button from "./Button";
import { Field, Fieldset, Label } from "./Forms";
import { Input } from "./Input";

const Erc20Transaction = ({multisigContract}: {multisigContract?: Contract}) => {
  const targetFunctionSelector = toBN(getSelectorFromName("transfer"));
  const [targetAddress, setTargetAddress] = useState<string>("");
  const [receiver, setReceiver] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  
  const submit = async () => {
    const bigNumberizedParameters = [toBN(receiver), toBN(amount)];
    const response = await multisigContract?.submit_transaction(targetAddress, targetFunctionSelector, bigNumberizedParameters);
    console.log(response)
  };
  
  /* TODO: Fetch token info
  const { contract: targetContract } = useContract({
    abi: Source.abi as Abi,
    address: targetAddress,
  });
  const [symbol, setSymbol] = useState<string>("");
  useEffect(() => {
    const fetchTokenInfo = async () => {
      const symbol = await targetContract?.symbol();
      if (symbol) {
        setSymbol(shortStringFeltToStr(toBN(filterNonFeltChars(symbol.toString()))));
      }
    };
    fetchTokenInfo();
  }, [targetContract])
  */

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

      <Field>
        <Label>Receiver:</Label>
        <Input
          type="text"
          value={receiver}
          onChange={(e) => setReceiver(e.target.value)}
        ></Input>
      </Field>

      <Field>
        <Label>Amount:</Label>
        <Input
          type="text"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        ></Input>
      </Field>

      <Button fullWidth onClick={() => submit()}>Submit a new transaction</Button>
    </Fieldset>
  )
}

export default Erc20Transaction
