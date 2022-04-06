import { useStarknet, useStarknetCall } from "@starknet-react/core";
import type { NextPage } from "next";
import { useMemo } from "react";
import { json } from "starknet";
import { toBN } from "starknet/dist/utils/number";
import { ConnectWallet } from "~/components/ConnectWallet";
import { MultisigSettings } from "~/components/MultisigSettings";
import { TransactionList } from "~/components/TransactionList";
import { motion, AnimatePresence } from "framer-motion";

import Box from "~/components/Box";
import Header from "~/components/Header";
import Footer from "~/components/Footer";
import { styled } from "../../stitches.config";

const BorderedContainer = styled(motion.div, {
  boxSizing: "border-box",
  width: "100%",
  maxWidth: "520px",
  margin: "0 auto",
  border: "3px solid $indigo12",
  padding: "$8",
});

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
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          flex: "1",
          position: "relative",
        }}
      >
        <AnimatePresence exitBeforeEnter>
          {!account && (
            <BorderedContainer
              key="connect-account"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{
                y: { type: "spring", stiffness: 300, damping: 30 },
                opacity: { duration: 0.2 },
              }}
            >
              <ConnectWallet />
            </BorderedContainer>
          )}

          {account && (
            <BorderedContainer
              key="connected-account"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{
                y: { type: "spring", stiffness: 300, damping: 30 },
                opacity: { duration: 0.2 },
              }}
            >
              <MultisigSettings />
              <TransactionList />
            </BorderedContainer>
          )}
        </AnimatePresence>
      </Box>
      <Footer />
    </Box>
  );
};

export default Home;
