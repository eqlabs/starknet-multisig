import { useStarknet, useStarknetCall } from "@starknet-react/core";
import type { NextPage } from "next";
import { useMemo } from "react";
import { json } from "starknet";
import { toBN } from "starknet/dist/utils/number";
import { ConnectWallet } from "~/components/ConnectWallet";
import { MultisigSettings } from "~/components/MultisigSettings";
import { TransactionList } from "~/components/TransactionList";

import ThemeChanger from "~/components/ThemeChanger";

const Home: NextPage = () => {
  const { account } = useStarknet();

  return (
    <div>
      <ThemeChanger />
      <h2>Multisig</h2>
      <ConnectWallet />

      {account && <MultisigSettings />}
      <p>
        Please check{" "}
        <a href="https://github.com/eqlabs/starknet-multisig" target="_blank">
          GitHub
        </a>{" "}
        for more information.
      </p>
      <h2>Recent Transactions</h2>
      <TransactionList />
    </div>
  );
};

export default Home;
