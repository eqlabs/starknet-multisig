import { InjectedConnector, useStarknet } from "@starknet-react/core";
import { useRouter } from "next/router";
import { useCallback, useEffect } from "react";
import { useSnapshot } from "valtio";
import Box from "~/components/Box";
import Button from "~/components/Button";
import { Symbol } from "~/components/Logos";
import Paragraph from "~/components/Paragraph";
import { state } from "~/state";

export function ConnectWallet() {
  const router = useRouter()
  const { connect, account } = useStarknet()
  const { walletAddress } = useSnapshot(state)
  
  useEffect(() => {
    if (account && account !== walletAddress) {
      console.log("EBINEINBIEN")
      state.walletAddress = account
      router.push("/create")
    }
  }, [account, router, walletAddress])

  const connectings = useCallback(() => {
    console.log("ebinclickings")
    connect(new InjectedConnector())
  }, [connect])

  return (
    <>
      <Box
        css={{
          width: "$12",
          marginBottom: "$10",
        }}
      >
        <Symbol />
      </Box>
      <h1>Welcome to Starsign</h1>
      <hr />
      <Paragraph css={{ fontSize: "$lg", margin: "$6 0", color: "$textMuted" }}>
        Get started by connecting your wallet. This allows you to create new
        multisignature contracts or use existing contracts.
      </Paragraph>
      <Button fullWidth onClick={connectings}>
        Connect wallet (Argent X)
      </Button>
    </>
  );
}
