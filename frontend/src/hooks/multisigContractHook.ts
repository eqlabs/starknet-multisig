import { useStarknet } from "@starknet-react/core";
import { useEffect, useState } from "react";
import { Abi, Contract } from "starknet";
import { sanitizeHex } from "starknet/dist/utils/encode";
import { toBN, toHex } from "starknet/dist/utils/number";
import { MultisigTransaction } from "~/types";
import { mapTargetHashToText } from "~/utils";
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
  const { account, library: provider } = useStarknet();
  const [loading, setLoading] = useState<boolean>(true);
  const [owners, setOwners] = useState<string[]>([]);
  const [threshold, setThreshold] = useState<number>(0);
  const [transactionCount, setTransactionCount] = useState<number>(0);
  const [transactions, setTransactions] = useState<MultisigTransaction[]>([]);
  const [contract, setContract] = useState<Contract | undefined>();

  useEffect(() => {
    if (account) {
      try {
        const multisigContract = new Contract(
          Source.abi as Abi,
          address,
          provider
        );
        setContract(multisigContract);
      } catch (_e) {
        console.error(_e);
      }
    }
  }, [account, address, provider]);

  useEffect(() => {
    const fetchInfo = async () => {
      setLoading(true);

      const { owners: ownersResponse } = (await contract?.get_owners()) || {
        owners: [],
      };
      const owners = ownersResponse.map(toHex).map(sanitizeHex);
      const { confirmations_required: threshold } =
        (await contract?.get_confirmations_required()) || {
          confirmations_required: toBN(0),
        };
      const { res: transactionCount } =
        (await contract?.get_transactions_len()) || {
          transactions_len: toBN(0),
        };
      setOwners(owners);
      setThreshold(threshold.toNumber());
      transactionCount && setTransactionCount(transactionCount.toNumber());

      setLoading(false);
    };

    account && fetchInfo();

    return () => {
      setOwners([]);
      setThreshold(0);
      setTransactionCount(0);
    };
  }, [account, contract]);

  useEffect(() => {
    const fetchTransactions = async () => {
      setLoading(true);
      try {
        if (contract && transactionCount > 0) {
          let currentTransactionIndex = transactionCount - 1;
          let transactions: MultisigTransaction[] = [];

          while (currentTransactionIndex >= 0) {
            const { tx: transaction, tx_calldata: calldata } =
              await contract.get_transaction(currentTransactionIndex);
            const parsedTransaction: MultisigTransaction = {
              txId: currentTransactionIndex,
              to: toHex(transaction.to),
              function_selector: mapTargetHashToText(
                transaction.function_selector.toString()
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
      } catch (_e) {
        console.log(_e);
        setLoading(false);
      }
      setLoading(false);
    };

    !loading && account && fetchTransactions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contract, transactionCount]);

  return {
    contract,
    loading,
    owners,
    threshold,
    transactionCount,
    transactions,
  };
};
