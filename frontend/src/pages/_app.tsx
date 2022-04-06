import type { AppProps } from "next/app";
import NextHead from "next/head";
import { ThemeProvider } from "next-themes";
import { darkTheme } from "../../stitches.config";
import { StarknetProvider } from "@starknet-react/core";

function MyApp({ Component, pageProps }: AppProps) {
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
          <title>Multisig</title>
        </NextHead>
        <Component {...pageProps} />
      </ThemeProvider>
    </StarknetProvider>
  );
}

export default MyApp;
