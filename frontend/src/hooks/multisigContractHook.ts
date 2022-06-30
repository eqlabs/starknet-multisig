import { useStarknet } from "@starknet-react/core";
import { useEffect, useState } from "react";
import { Abi, Contract, validateAndParseAddress } from "starknet";
import { sanitizeHex } from "starknet/dist/utils/encode";
import { toBN, toHex } from "starknet/dist/utils/number";
import { useSnapshot } from "valtio";
import { state } from "~/state";
import {
  MultisigTransaction,
  pendingStatuses,
  TransactionStatus,
} from "~/types";
import { mapTargetHashToText } from "~/utils";
import Source from "../../public/Multisig.json";
import { useTransactionStatus } from "./transactionStatus";

export const useMultisigContract = (
  address: string
): {
  contract: Contract | undefined;
  status: TransactionStatus;
  owners: string[];
  threshold: number;
  transactionCount: number;
  transactions: MultisigTransaction[];
} => {
  const { library: provider } = useStarknet();
  const [status, send] = useTransactionStatus();
  const { multisigs } = useSnapshot(state);

  const [owners, setOwners] = useState<string[]>([]);
  const [threshold, setThreshold] = useState<number>(0);
  const [transactionCount, setTransactionCount] = useState<number>(0);
  const [transactions, setTransactions] = useState<MultisigTransaction[]>([]);
  const [contract, setContract] = useState<Contract | undefined>();

  const [latestStatus, setLatestStatus] = useState<
    TransactionStatus | undefined
  >();

  useEffect(() => {
    if (address) {
      try {
        const validatedAddress = validateAndParseAddress(address);
        const multisigContract = new Contract(
          Source.abi as Abi,
          validatedAddress,
          provider
        );
        setContract(multisigContract);
      } catch (_e) {
        console.error(_e);
      }
    }
  }, [address, provider]);

  useEffect(() => {
    const fetchInfo = async () => {
      // Search for multisig in local cache with transactionHash included
      const matchMultisigCache = multisigs.find(
        (multisig) =>
          multisig.address === contract?.address && multisig.transactionHash
      );

      // If match found, use more advanced state transitions
      if (matchMultisigCache) {
        if (!latestStatus) {
          const receipt = await provider.getTransaction(
            matchMultisigCache.transactionHash
          );
          setLatestStatus(receipt.status as TransactionStatus);
        }

        if (latestStatus !== (status.value as TransactionStatus)) {
          if (latestStatus !== TransactionStatus.REJECTED) {
            send("ADVANCE");
          } else {
            send("REJECT");
          }
        }
      } else {
        // If match not found, just see if contract is deployed
        const deployed = await contract?.deployed();
        deployed && send("DEPLOYED");
      }

      // If contract is deployed, fetch more info
      if (pendingStatuses.includes(status.value as TransactionStatus)) {
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
      }
    };

    contract && fetchInfo();

    return () => {
      setOwners([]);
      setThreshold(0);
      setTransactionCount(0);
    };
  }, [contract, latestStatus, multisigs, provider, send, status.value]);

  useEffect(() => {
    const fetchTransactions = async () => {
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
      } catch (error) {
        console.error(error);
      }
    };

    // Fetch transactions of this multisig if the contract is deployed
    pendingStatuses.includes(status.value as TransactionStatus) &&
      fetchTransactions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contract, transactionCount]);

  return {
    contract,
    status: status.value as TransactionStatus,
    owners,
    threshold,
    transactionCount,
    transactions,
  };
};
