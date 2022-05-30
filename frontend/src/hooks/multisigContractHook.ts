import { useContract } from "@starknet-react/core";
import { useEffect, useState } from "react";
import { Abi, Contract } from "starknet";
import { BigNumberish, toBN, toHex } from "starknet/dist/utils/number";
import { MultisigTransaction } from "~/types";
import { filterNonFeltChars, shortStringFeltToStr } from "~/utils";
import Source from "../../public/Multisig.json";

export const useMultisigContract = (
  address: string
): {
  contract: Contract | undefined;
  loading: boolean;
  owners: string[];
  threshold: number;
  transactionCount: number;
  transactions: MultisigTransaction[];
} => {
  const { contract: multisigContract } = useContract({
    abi: Source.abi as Abi,
    address: address,
  });

  const [loading, setLoading] = useState<boolean>(true);
  const [owners, setOwners] = useState<string[]>([]);
  const [threshold, setThreshold] = useState<number>(0);
  const [transactionCount, setTransactionCount] = useState<number>(0);
  const [transactions, setTransactions] = useState<MultisigTransaction[]>([]);

  useEffect(() => {
    const fetchInfo = async () => {
      setLoading(true);

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

      setLoading(false);
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
      setLoading(true);

      if (multisigContract && transactionCount > 0) {
        let currentTransactionIndex = transactionCount - 1;
        let transactions: MultisigTransaction[] = [];

        while (currentTransactionIndex >= 0) {
          const { tx: transaction, tx_calldata: calldata } =
            await multisigContract.get_transaction(currentTransactionIndex);

          const parsedTransaction: MultisigTransaction = {
            txId: currentTransactionIndex,
            to: toHex(transaction.to),
            function_selector: shortStringFeltToStr(
              toBN(filterNonFeltChars(transaction.function_selector.toString()))
            ),
            calldata: calldata.toString().split(","),
            calldata_len: transaction.calldata_len.toNumber(),
            executed: transaction.executed.toNumber() === 1,
            num_confirmations: transaction.num_confirmations.toNumber(),
          };

          transactions.push(parsedTransaction);
          currentTransactionIndex -= 1;
        }

        setTransactions(transactions);
      }

      setLoading(false);
    };
    fetchTransactions();
  }, [multisigContract, transactionCount]);

  return {
    contract: multisigContract,
    loading,
    owners,
    threshold,
    transactionCount,
    transactions,
  };
};
