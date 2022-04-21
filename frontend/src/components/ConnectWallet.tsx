import { InjectedConnector, useStarknet } from "@starknet-react/core";
import { useRouter } from "next/router";
import { useEffect } from "react";
import Box from "~/components/Box";
import Button from "~/components/Button";
import { Symbol } from "~/components/Logos";
import Paragraph from "~/components/Paragraph";

export function ConnectWallet() {
  const router = useRouter()
  const { connect, account } = useStarknet()

  useEffect(() => {
    if (account) {
      router.push("/create")
    }
  }, [account])

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
      <Button fullWidth onClick={() => connect(new InjectedConnector())}>
        Connect wallet (Argent X)
      </Button>
    </>
  );
}
