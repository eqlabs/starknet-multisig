import { useStarknetCall } from "@starknet-react/core";
import type { NextPage } from "next";
import { useMemo } from "react";
import { json } from "starknet";
import { toBN } from "starknet/dist/utils/number";
import { ConnectWallet } from "~/components/ConnectWallet";
import { MultisigSettings } from "~/components/MultisigSettings";
import { TransactionList } from "~/components/TransactionList";

const Home: NextPage = () => {
  return (
    <div>
      <h2>Multisig</h2>
      <ConnectWallet />

      <MultisigSettings />
      <h2>Recent Transactions</h2>
      <TransactionList />
    </div>
  );
};

export default Home;
