import {
  Transaction,
  useStarknetTransactionManager,
} from "@starknet-react/core";
import React from "react";

function TransactionItem({ transaction }: { transaction: Transaction }) {
  const link =
    "https://goerli.voyager.online/tx/" + transaction.transactionHash;
  return (
    <span>
      <a href={link} target="_blank">
        {transaction.status}
      </a>
    </span>
  );
}

export function TransactionList() {
  const { transactions } = useStarknetTransactionManager();
  const revMyArr = ([] as Transaction[]).concat(transactions).reverse();
  return (
    <>
      {revMyArr.length > 0 && (
        <>
          <h2>Recent Transactions</h2>
          <ul>
            {revMyArr.map((transaction, index) => (
              <li key={index}>
                <TransactionItem transaction={transaction} />
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}
