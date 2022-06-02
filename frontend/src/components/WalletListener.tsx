import { InjectedConnector, useStarknet } from "@starknet-react/core";
import { useRouter } from "next/router";
import { useEffect } from "react";
import { useSnapshot } from "valtio";
import { state } from "~/state";

const WalletListener = () => {
  const router = useRouter()
  const { account, connect } = useStarknet();
  const { walletAddress } = useSnapshot(state)

  useEffect(() => {
    if (!account && !walletAddress) {
      router.asPath !== "/" && router.push("/")
    } else if (!walletAddress && account) {
      state.walletAddress = account
    } else if (walletAddress && !account) {
      connect(new InjectedConnector())
    }
  }, [account, connect, router, walletAddress])
  
  return <></>
}

export default WalletListener
