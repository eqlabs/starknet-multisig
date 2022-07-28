import { styled } from "@stitches/react";
import { Contract } from "starknet";
import { toFelt } from "starknet/utils/number";
import { MultisigTransaction } from "~/types";
import { StyledButton } from "./Button";

const Transaction = styled("li", {
  listStyle: "none",
  margin: "$1 0",
  padding: "$3",
  textIndent: "0",
  display: "flex",
  flexDirection: "column",
  background: "$inputBg",
  borderRadius: "$sm",
})

const TransactionInfo = styled("div", {
  display: "flex",
  flexDirection: "row",
  position: "relative",
  justifyContent: "space-between",
  alignItems: "center",
})

const MultisigTransactionList = ({multisigContract, threshold, transactions}: {multisigContract?: Contract, threshold: number, transactions: MultisigTransaction[]}) => {
  const confirm = async (nonce: number) => {
    try {
      const { res: isConfirmed } = await multisigContract?.is_confirmed(nonce, "0x01D0C9b75d6bE0Ed6206C73b2E7657bc92a9Be66c2b5B9D241E9Fa6f47dE3743")
      const { threshold } = await multisigContract?.get_threshold()
      console.log(isConfirmed.toString(), threshold.toString(), toFelt(isConfirmed), toFelt(threshold))
      await multisigContract?.confirm_transaction(nonce)
    } catch (error) {
      console.error(error)
    }
  }

  const execute = async (nonce: number) => {
    try {
      const { res: isConfirmed } = await multisigContract?.is_confirmed(nonce, "0x01D0C9b75d6bE0Ed6206C73b2E7657bc92a9Be66c2b5B9D241E9Fa6f47dE3743")
      const { threshold } = await multisigContract?.get_threshold()
      const response = await multisigContract?.get_transaction(nonce)
      console.log(response, isConfirmed.toString(), threshold.toString(), toFelt(isConfirmed), toFelt(threshold))
      await multisigContract?.execute_transaction(nonce)
    } catch (error) {
      console.error(error)
    }
  }

  return (<ul style={{ display: "flex", flexDirection: "column", position: "relative", alignItems: "stretch", margin: "0", padding: "0"}}>
      {transactions.filter(transaction => !transaction.executed).map(transaction => (
        <Transaction key={`multisigTransaction-${transaction.nonce}`}>
          <TransactionInfo>
            <small>Nonce: {transaction.nonce}</small>
            <small>{transaction.function_selector}</small>
          </TransactionInfo>

          <TransactionInfo>
            <span>Confirmations: {transaction.threshold + "/" + threshold}</span>
            <div>
              {transaction.threshold < threshold ? <StyledButton size="sm" onClick={() => confirm(transaction.nonce)}>Confirm</StyledButton> : <StyledButton disabled={transaction.threshold < threshold} size="sm" onClick={() => execute(transaction.nonce)}>Execute</StyledButton>
              }
            </div>
          </TransactionInfo>
        </Transaction>
      ))}
    </ul>
  );
}

export default MultisigTransactionList;
