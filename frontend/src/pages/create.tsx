import { AnimatePresence } from "framer-motion";
import type { NextPage } from "next";
import BorderedContainer from "~/components/BorderedContainer";
import Box from "~/components/Box";
import Footer from "~/components/Footer";
import Header from "~/components/Header";
import { NewMultisig } from "~/components/NewMultisig";

const Create: NextPage = () => (
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
          <NewMultisig />
        </BorderedContainer>
      </AnimatePresence>
    </Box>
    <Footer />
  </Box>
);

export default Create;
