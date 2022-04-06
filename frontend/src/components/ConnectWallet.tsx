import { useStarknet, InjectedConnector } from "@starknet-react/core";
import Button from "~/components/Button";
import Box from "~/components/Box";
import Paragraph from "~/components/Paragraph";
import { Symbol } from "~/components/Logos";

export function ConnectWallet() {
  const { connect } = useStarknet();

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
