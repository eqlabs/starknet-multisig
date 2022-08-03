import { useContract } from "@starknet-react/core";
import { useEffect, useState } from "react";
import { Abi, Contract, validateAndParseAddress } from "starknet";
import { getSelectorFromName } from "starknet/dist/utils/hash";
import { bnToUint256, Uint256, uint256ToBN } from "starknet/dist/utils/uint256";
import { BigNumberish, toBN } from "starknet/utils/number";
import { filterNonFeltChars, formatAmount, parseAmount, shortStringFeltToStr } from "~/utils";
import Source from "../../public/erc20.json";
import Button from "./Button";
import { Field, Fieldset, Label } from "./Forms";
import { Input, ValidatedInput } from "./Input";
import { LoaderWithDelay } from "./SkeletonLoader";

const Erc20Transaction = ({multisigContract}: {multisigContract?: Contract}) => {
  const targetFunctionSelector = getSelectorFromName("transfer");
  const [targetAddress, setTargetAddress] = useState<string>("");
  const [recipient, setRecipient] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  
  const submit = async () => {
    if (multisigContract) {
      const parsedAmount = parseAmount(amount, tokenInfo?.decimals || 18)
      const amountUint256 = bnToUint256(parsedAmount)
      const callData = [toBN(recipient), amountUint256.low, amountUint256.high];
      const { res: nonce } = await multisigContract?.get_transactions_len();
      await multisigContract?.submit_transaction(targetAddress, targetFunctionSelector, callData, nonce);
    }
  };
  
  const { contract: targetContract } = useContract({
    abi: Source.abi as Abi,
    address: targetAddress,
  });

  const [tokenInfo, setTokenInfo] = useState<{symbol: string | undefined, balance: string | undefined, decimals: number | undefined} | undefined | null>();
  useEffect(() => {
    const fetchTokenInfo = async () => {
      let symbol, balance, decimals;
      try {
        if (validateAndParseAddress(targetAddress)) {
          setTokenInfo(null);
          const symbolResponse: string = await targetContract?.symbol();
          const decimalsResponse: { decimals: BigNumberish } = await targetContract?.decimals();
          const balanceResponse: { balance: Uint256 } = await targetContract?.balanceOf(multisigContract?.address);
          if (symbolResponse) {
            symbol = shortStringFeltToStr(toBN(filterNonFeltChars(symbolResponse.toString())));
          }
          if (decimalsResponse) {
            decimals = decimalsResponse.decimals.toNumber();
            if (balanceResponse) {
              balance = formatAmount(uint256ToBN(balanceResponse.balance), decimals)
            }
          }
        }
      } catch (error) {
        console.error(error);
      }
      setTokenInfo({ symbol, balance, decimals })
    }
    fetchTokenInfo()
  }, [multisigContract?.address, targetAddress, targetContract])

  return (
    <Fieldset>
      {/* TODO: Use a combobox for this field to give suggestions of deployed tokens */}
      <Field>
        <Label>Target contract address:</Label>
        <ValidatedInput
          type="text"
          value={targetAddress}
          validationFunction={(e) => {
            try {
              // TODO: This "validation" accepts things like 0 or "asd" as addresses, as they can be parsed and padded to the 64 bit addresses. Only accept already parsed addresses from the users.
              const result = validateAndParseAddress(e.target.value)
              return result ? true : false
            } catch (_e) {
              return false
            }
          }}
          onChange={(e) => setTargetAddress(e.target.value)}
        ></ValidatedInput>
      </Field>

      {tokenInfo !== undefined && tokenInfo === null ? <div>
        <LoaderWithDelay />
        <LoaderWithDelay />
        <LoaderWithDelay />
      </div> : tokenInfo?.symbol &&
        <div>
          Symbol: {tokenInfo.symbol}<br/>
          Decimals: {tokenInfo.decimals}<br/>
          Balance: {tokenInfo.balance}
        </div>
      }
      
      <Field>
        <Label>Receiver:</Label>
        <ValidatedInput
          type="text"
          value={recipient}
          validationFunction={(e) => {
            try {
              // TODO: This "validation" accepts things like 0 or "asd" as addresses, as they can be parsed and padded to the 64 bit addresses. Only accept already parsed addresses from the users.
              const result = validateAndParseAddress(e.target.value)
              return !!result
            } catch (_e) {
              return false
            }
          }}
          onChange={(e) => setRecipient(e.target.value)}
        ></ValidatedInput>
      </Field>

      <Field>
        <Label>Amount:</Label>
        <Input
          type="number"
          value={amount}
          min={0}
          step={0.01}
          onChange={(e) => setAmount(e.target.value)}
        ></Input>
      </Field>

      <Button fullWidth onClick={() => submit()}>Submit a new transaction</Button>
    </Fieldset>
  )
}

export default Erc20Transaction
