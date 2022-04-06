import { useStarknet, useStarknetCall } from "@starknet-react/core";
import type { NextPage } from "next";
import { useMemo } from "react";
import { json } from "starknet";
import { toBN } from "starknet/dist/utils/number";
import { ConnectWallet } from "~/components/ConnectWallet";
import { MultisigSettings } from "~/components/MultisigSettings";
import { TransactionList } from "~/components/TransactionList";
import Box from "~/components/Box";

import Header from "~/components/Header";

const Home: NextPage = () => {
  const { account } = useStarknet();

  return (
    <Box
      css={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh",
        padding: "0 $6",
      }}
    >
      <Header />
      <Box
        css={{
          display: "flex",
          alignContent: "center",
          justifyContent: "center",
          flex: "1",
        }}
      >
        <Box
          css={{
            width: "100%",
            maxWidth: "620px",
            margin: "0 auto",
            border: "3px solid $indigo12",
            padding: "$8",
            alignSelf: "center",
          }}
        >
          <ConnectWallet />

          {account && <MultisigSettings />}

          <p>
            Please check{" "}
            <a
              href="https://github.com/eqlabs/starknet-multisig"
              target="_blank"
            >
              GitHub
            </a>{" "}
            for more information.
          </p>
          <h2>Recent Transactions</h2>
          <TransactionList />
        </Box>
      </Box>
    </Box>
  );
};

export default Home;
