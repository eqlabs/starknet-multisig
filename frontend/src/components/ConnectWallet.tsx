import { getInstalledInjectedConnectors, InjectedConnector, useStarknet } from "@starknet-react/core";
import { useRouter } from "next/router";
import Box from "~/components/Box";
import Button from "~/components/Button";
import { Symbol } from "~/components/Logos";
import Paragraph from "~/components/Paragraph";
import { state } from "~/state";
import { mapWalletIdToText } from "~/utils";

export function ConnectWallet() {
  const router = useRouter();
  const { connect } = useStarknet();

  const connectCallback = async (wallet: InjectedConnector) => {
    connect(wallet);
    state.walletInfo = { id: wallet.id(), address: (await wallet.account())?.address || undefined }
    router.push("/create");
  };

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

      <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
      {getInstalledInjectedConnectors().map(wallet => (
        <Button key={wallet.id()} fullWidth onClick={() => connectCallback(wallet)}>
          Connect wallet ({mapWalletIdToText(wallet)})
        </Button>
      ))}
      </div>
    </>
  );
}
