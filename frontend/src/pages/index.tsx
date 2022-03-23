import { useStarknetCall } from "@starknet-react/core";
import type { NextPage } from "next";
import { useMemo } from "react";
import { toBN } from "starknet/dist/utils/number";
import { ConnectWallet } from "~/components/ConnectWallet";
import { IncrementCounter } from "~/components/IncrementCounter";
import { MultisigSettings } from "~/components/MultisigSettings";
import { TransactionList } from "~/components/TransactionList";
import { useCounterContract } from "~/hooks/counter";

const Home: NextPage = () => {
  const { contract: counter } = useCounterContract();

  const { data: counterResult } = useStarknetCall({
    contract: counter,
    method: "counter",
    args: [],
  });

  const counterValue = useMemo(() => {
    if (counterResult && counterResult.length > 0) {
      const value = toBN(counterResult[0]);
      return value.toString(10);
    }
  }, [counterResult]);

  return (
    <div>
      <h2>Wallet</h2>
      <ConnectWallet />

      <MultisigSettings />
      <h2>Recent Transactions</h2>
      <TransactionList />
    </div>
  );
};

export default Home;
