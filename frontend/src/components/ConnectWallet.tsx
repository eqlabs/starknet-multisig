import { useStarknet, InjectedConnector } from "@starknet-react/core";
import Button from "~/components/Button";

export function ConnectWallet() {
  const { account, connect } = useStarknet();

  if (account) {
    return <p></p>; /* <p>Account: {account}</p> */
  }

  return (
    <Button fullWidth onClick={() => connect(new InjectedConnector())}>
      Connect wallet (Argent X)
    </Button>
  );
}
