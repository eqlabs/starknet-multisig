import { useStarknetTransactionManager } from "@starknet-react/core";

export const useTransactionsToAddress = () => {
  const { transactions } = useStarknetTransactionManager();

  console.log(transactions)
}

export const useTransactionsFromAddress = () => {
  const { transactions } = useStarknetTransactionManager();

  console.log(transactions)
}
