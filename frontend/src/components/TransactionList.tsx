import {
  Transaction,
  useStarknetTransactionManager,
} from "@starknet-react/core";
import React from "react";

function TransactionItem({ transaction }: { transaction: Transaction }) {
  return (
    <span>
      {transaction.transactionHash} - {transaction.status}
    </span>
  );
}

export function TransactionList() {
  const { transactions } = useStarknetTransactionManager();
  var revMyArr = ([] as Transaction[]).concat(transactions).reverse();
  return (
    <ul>
      {revMyArr.map((transaction, index) => (
        <li key={index}>
          <TransactionItem transaction={transaction} />
        </li>
      ))}
    </ul>
  );
}
