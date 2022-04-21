import { AnimatePresence } from "framer-motion";
import type { NextPage } from "next";
import BorderedContainer from "~/components/BorderedContainer";
import Box from "~/components/Box";
import { ExistingMultisig } from "~/components/ExistingMultisig";
import Footer from "~/components/Footer";
import Header from "~/components/Header";
import { TransactionList } from "~/components/TransactionList";

const Contract: NextPage = () => (
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
          <ExistingMultisig />
          <TransactionList />
        </BorderedContainer>
      </AnimatePresence>
    </Box>
    <Footer />
  </Box>
);

export default Contract;
