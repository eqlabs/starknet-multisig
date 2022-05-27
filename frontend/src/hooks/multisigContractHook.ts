import { useContract } from "@starknet-react/core";
import { useEffect, useState } from "react";
import { Abi, Contract, Transaction } from "starknet";
import { BigNumberish, toBN, toHex } from "starknet/dist/utils/number";
import Source from "../../public/Multisig.json";

export const useMultisigContract = (
  address: string
): {
  contract: Contract | undefined;
  owners: string[];
  threshold: number;
  transactionCount: number;
  transactions: Transaction[];
} => {
  const { contract: multisigContract } = useContract({
    abi: Source.abi as Abi,
    address: address,
  });

  const [owners, setOwners] = useState<string[]>([]);
  const [threshold, setThreshold] = useState<number>(0);
  const [transactionCount, setTransactionCount] = useState<number>(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
    const fetchInfo = async () => {
      const { owners } = (await multisigContract?.get_owners()) || {
        owners: [],
      };
      const { confirmations_required: threshold } =
        (await multisigContract?.get_confirmations_required()) || {
          confirmations_required: toBN(0),
        };
      const { res: transactionCount } =
        (await multisigContract?.get_transactions_len()) || {
          transactions_len: toBN(0),
        };

      setOwners(owners.map((owner: BigNumberish) => toHex(owner)));
      setThreshold(threshold.toNumber());
      transactionCount && setTransactionCount(transactionCount.toNumber());
    };
    fetchInfo();

    return () => {
      setOwners([]);
      setThreshold(0);
      setTransactionCount(0);
    };
  }, [multisigContract]);

  useEffect(() => {
    const fetchTransactions = async () => {
      if (multisigContract && transactionCount > 0) {
        let currentTransactionIndex = transactionCount;
        let transactions: Transaction[] = [];
        while (currentTransactionIndex > 0) {
          const transaction = await multisigContract.get_transaction(
            currentTransactionIndex
          );
          transactions.push(transaction);
          currentTransactionIndex -= 1;
        }
        setTransactions(transactions);
      }
    };
    fetchTransactions();
  }, [multisigContract, transactionCount]);

  return {
    contract: multisigContract,
    owners,
    threshold,
    transactionCount,
    transactions,
  };
};
