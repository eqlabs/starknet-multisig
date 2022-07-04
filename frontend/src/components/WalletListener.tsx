import { getInstalledInjectedConnectors, useStarknet } from "@starknet-react/core";
import { useRouter } from "next/router";
import { useEffect } from "react";
import { useSnapshot } from "valtio";
import { state } from "~/state";

const WalletListener = () => {
  const router = useRouter();
  const { account, connect } = useStarknet();
  const { walletInfo } = useSnapshot(state);

  useEffect(() => {
    if (!account && !walletInfo) {
      router.asPath !== "/" && router.push("/")
    } else if (walletInfo && !walletInfo.address && account) {
      state.walletInfo = { ...walletInfo, address: account }
    } else if (walletInfo && walletInfo.id && !account) {
      const connector = getInstalledInjectedConnectors().find(connector => connector.id() === walletInfo.id)
      if (connector) {
        connect(connector)
      } else {
        router.asPath !== "/" && router.push("/")
      }
    }
  }, [account, connect, router, walletInfo])
  
  return <></>
}

export default WalletListener
