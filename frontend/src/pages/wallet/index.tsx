import { AnimatePresence } from "framer-motion";
import type { NextPage } from "next";
import { useSnapshot } from "valtio";
import BorderedContainer from "~/components/BorderedContainer";
import Box from "~/components/Box";
import Footer from "~/components/Footer";
import { Legend } from "~/components/Forms";
import Header from "~/components/Header";
import ModeToggle from "~/components/ModeToggle";
import MultisigAddressInput from "~/components/MultisigAddressInput";
import MultisigList from "~/components/MultisigList";
import { state } from "~/state";

const Multisigs = () => {
  const { multisigs } = useSnapshot(state);
  return <>{multisigs?.length > 0 && (
    <>
      <hr />
      <Legend as="h2">Visited Multisigs</Legend>
      <MultisigList />
    </>
  )}</>
}

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
          <ModeToggle />
          <Legend as="h2">Manual Input</Legend>
          <MultisigAddressInput />
          <Multisigs />
        </BorderedContainer>
      </AnimatePresence>
    </Box>
    <Footer />
  </Box>
);

export default Contract;
