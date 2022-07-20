import { useStarknet } from "@starknet-react/core";
import { useRouter } from "next/router";
import { useCallback } from "react";
import { state } from "~/state";
import Button from "./Button";

export function DisconnectWallet() {
  const router = useRouter();
  const { disconnect, account } = useStarknet();

  const disconnectCallback = useCallback(() => {
    disconnect();
    state.walletInfo = false;
    router.push("/");
  }, [disconnect, router]);

  return (
    account ? (<Button size="sm" variant="link" onClick={disconnectCallback}>
      Disconnect
    </Button>) : <></>
  )
}
