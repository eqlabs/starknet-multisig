import { useStarknet } from "@starknet-react/core";
import { useCallback, useEffect, useState } from "react";
import { Abi, Contract, validateAndParseAddress } from "starknet";
import { sanitizeHex } from "starknet/dist/utils/encode";
import { toBN, toHex } from "starknet/dist/utils/number";
import { useSnapshot } from "valtio";
import { MultisigInfo, state } from "~/state";
import {
  MultisigTransaction,
  pendingStatuses,
  TransactionStatus,
} from "~/types";
import { compareStatuses, mapTargetHashToText } from "~/utils";
import Source from "../../public/Multisig.json";
import { useTransactionStatus } from "./transactionStatus";

export const useMultisigContract = (
  address: string
): {
  contract: Contract | undefined;
  status: TransactionStatus;
  loading: boolean;
  owners: string[];
  threshold: number;
  transactionCount: number;
  transactions: MultisigTransaction[];
} => {
  const { multisigs } = useSnapshot(state);

  const { library: provider } = useStarknet();

  const [status, send] = useTransactionStatus();
  const [loading, setLoading] = useState<boolean>(true);

  const [owners, setOwners] = useState<string[]>([]);
  const [threshold, setThreshold] = useState<number>(0);
  const [transactionCount, setTransactionCount] = useState<number>(0);
  const [transactions, setTransactions] = useState<MultisigTransaction[]>([]);
  const [contract, setContract] = useState<Contract | undefined>();

  const [latestStatus, setLatestStatus] = useState<
    TransactionStatus | undefined
  >();

  const validatedAddress = validateAndParseAddress(address);

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

  // Search for multisig in local cache with transactionHash included
  const getMultisigFromCache = useCallback(
    () =>
      multisigs.find(
        (multisig: MultisigInfo) =>
          multisig.address === validatedAddress && multisig.transactionHash
      ),
    [multisigs, validatedAddress]
  );

  useEffect(() => {
    let heartbeat: NodeJS.Timer;

    const getLatestStatus = async () => {
      let tx_status;
      const cachedMultisig = getMultisigFromCache();

      if (cachedMultisig) {
        const response = await provider.getTransactionStatus(
          cachedMultisig.transactionHash
        );
        tx_status = response.tx_status as TransactionStatus;
        if (compareStatuses(tx_status, TransactionStatus.ACCEPTED_ON_L2) > 0) {
          clearInterval(heartbeat);
        }
      }

      tx_status !== undefined && setLatestStatus(tx_status);
    };

    getLatestStatus();
    setLoading(false);

    heartbeat = setInterval(getLatestStatus, 2000);

    return () => {
      clearInterval(heartbeat);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getMultisigFromCache, provider]);

  useEffect(() => {
    const getContractStatus = async () => {
      // If match found, use more advanced state transitions
      if (!latestStatus) {
        try {
          // If match not found, just see if contract is deployed
          const { res: transactionCount } =
            await contract?.get_transactions_len();
          transactionCount && send("DEPLOYED");
        } catch (_e) {
          console.error(_e);
        }
      }

      if (
        latestStatus &&
        compareStatuses(latestStatus, status.value as TransactionStatus) > 0
      ) {
        send("ADVANCE");
      } else if (latestStatus === TransactionStatus.REJECTED) {
        send("REJECT");
      }
    };

    contract && getContractStatus();
  }, [
    address,
    contract,
    getMultisigFromCache,
    latestStatus,
    multisigs,
    provider,
    send,
    status.value,
  ]);

  useEffect(() => {
    const fetchInfo = async () => {
      setLoading(true);
      try {
        // If contract is deployed, fetch more info
        if (
          status.value &&
          !pendingStatuses.includes(status.value as TransactionStatus)
        ) {
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

          setOwners(owners.map(validateAndParseAddress));
          setThreshold(threshold.toNumber());
          transactionCount && setTransactionCount(transactionCount.toNumber());
        }
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    };

    contract !== undefined && fetchInfo();

    return () => {
      setOwners([]);
      setThreshold(0);
      setTransactionCount(0);
    };
  }, [contract, latestStatus, multisigs, provider, send, status.value]);

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
      } catch (error) {
        console.error(error);
      }
      setLoading(false);
    };

    // Fetch transactions of this multisig if the contract is deployed
    status.value &&
      !pendingStatuses.includes(status.value as TransactionStatus) &&
      fetchTransactions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contract, transactionCount]);

  return {
    contract,
    status: status.value as TransactionStatus,
    loading,
    owners,
    threshold,
    transactionCount,
    transactions,
  };
};
