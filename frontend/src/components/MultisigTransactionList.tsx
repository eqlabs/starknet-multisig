import { styled } from "@stitches/react";
import { Contract } from "starknet";
import { useMultisigTransactions } from "~/hooks/transactions";
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
  const { confirmTransaction, executeTransaction } = useMultisigTransactions(multisigContract)
  return <ul style={{ display: "flex", flexDirection: "column", position: "relative", alignItems: "stretch", margin: "0", padding: "0"}}>
    {transactions.filter(transaction => !transaction.executed).map(transaction => (
      <Transaction key={`multisigTransaction-${transaction.txId}`}>
        <TransactionInfo>
          <small>TxID: {transaction.txId}</small>
          <small>{transaction.function_selector}</small>
        </TransactionInfo>

        <TransactionInfo>
          <span>Confirmations: {transaction.num_confirmations + "/" + threshold}</span>
          <div>
            {transaction.num_confirmations < threshold ? <StyledButton size="sm" onClick={async () => await confirmTransaction({
              args: [transaction.txId],
            })}>Confirm</StyledButton> : <StyledButton disabled={transaction.num_confirmations < threshold} size="sm" onClick={async () => await executeTransaction({
                args: [transaction.txId],
              })}>Execute</StyledButton>
            }
          </div>
        </TransactionInfo>
      </Transaction>
    ))}
  </ul>
};

export default MultisigTransactionList;
