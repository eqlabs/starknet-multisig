import {
  useStarknetInvoke,
  useStarknetTransactionManager,
} from "@starknet-react/core";
import { AddTransactionResponse, Contract } from "starknet";

export const useTransactionsToAddress = () => {
  const { transactions } = useStarknetTransactionManager();
};

export const useTransactionsFromAddress = () => {
  const { transactions } = useStarknetTransactionManager();
};

export const useMultisigTransactions = (
  multisigContract: Contract | undefined
): {
  submitTransaction: ({
    args,
  }: {
    args: unknown[];
  }) => Promise<AddTransactionResponse | undefined>;
  confirmTransaction: ({
    args,
  }: {
    args: unknown[];
  }) => Promise<AddTransactionResponse | undefined>;
  executeTransaction: ({
    args,
  }: {
    args: unknown[];
  }) => Promise<AddTransactionResponse | undefined>;
} => {
  const { invoke: submitTransaction } = useStarknetInvoke({
    contract: multisigContract,
    method: "submit_transaction",
  });

  const { invoke: confirmTransaction } = useStarknetInvoke({
    contract: multisigContract,
    method: "confirm_transaction",
  });

  const { invoke: executeTransaction } = useStarknetInvoke({
    contract: multisigContract,
    method: "execute_transaction",
  });

  return { submitTransaction, confirmTransaction, executeTransaction };
};
