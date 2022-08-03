import { styled } from "@stitches/react";
import { Contract } from "starknet";
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
      await multisigContract?.confirm_transaction(nonce)
    } catch (error) {
      console.error(error)
    }
  }

  const execute = async (nonce: number) => {
    try {
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
