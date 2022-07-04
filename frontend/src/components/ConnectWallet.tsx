import { getInstalledInjectedConnectors, InjectedConnector, useStarknet } from "@starknet-react/core";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import Box from "~/components/Box";
import Button from "~/components/Button";
import { Symbol } from "~/components/Logos";
import Paragraph from "~/components/Paragraph";
import { state } from "~/state";
import { mapWalletIdToText } from "~/utils";

export const ConnectWallet = () => {
  const router = useRouter();
  const { account, connect } = useStarknet();
  const [pendingWallet, setPendingWallet] = useState<InjectedConnector | undefined>();

  const connectCallback = async (wallet: InjectedConnector) => {
    setPendingWallet(wallet);
    connect(wallet);
  };

  useEffect(() => {
    if (pendingWallet && account) {
      state.walletInfo = { id: pendingWallet.id(), address: account }
      router.push("/create");
    }
  }, [account, pendingWallet, router]);

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
      {!pendingWallet ? (<>
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
      </>) : (<Paragraph css={{ fontSize: "$lg", margin: "$6 0", color: "$textMuted" }}>
        Unlock your {mapWalletIdToText(pendingWallet)} wallet.
      </Paragraph>)}
    </>
  );
}
