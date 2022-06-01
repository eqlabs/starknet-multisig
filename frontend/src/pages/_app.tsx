import { InjectedConnector, StarknetProvider, useStarknet } from "@starknet-react/core";
import { ThemeProvider } from "next-themes";
import type { AppProps } from "next/app";
import NextHead from "next/head";
import { useRouter } from 'next/router';
import { useEffect } from "react";
import { useSnapshot } from "valtio";
import { state } from "~/state";
import { darkTheme } from "../../stitches.config";

function MyApp({ Component, pageProps }: AppProps) {
  const router = useRouter()
  const { account, connect } = useStarknet();
  const { walletAddress } = useSnapshot(state)

  useEffect(() => {
    if (!account && !walletAddress) {
      router.push("/")
    } else if (!walletAddress && account) {
      state.walletAddress = account
    } else if (walletAddress && !account) {
      connect(new InjectedConnector())
    }
  }, [account])

  return (
    <StarknetProvider>
      <ThemeProvider
        attribute="class"
        defaultTheme="dark"
        enableSystem={false}
        value={{
          light: "light",
          dark: darkTheme.className,
        }}
      >
        <NextHead>
          <title>Starsign — StarkNet Multisig</title>
        </NextHead>
        <Component {...pageProps} />
      </ThemeProvider>
    </StarknetProvider>
  );
}

export default MyApp;
