import { useStarknet, InjectedConnector } from "@starknet-react/core";

export function ConnectWallet() {
  const { account, connect } = useStarknet();

  if (account) {
    return <p></p>; /* <p>Account: {account}</p> */
  }

  return (
    <button onClick={() => connect(new InjectedConnector())}>
      Connect wallet (Argent X)
    </button>
  );
}
