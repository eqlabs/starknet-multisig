import { Provider } from "starknet";

export const rpcUrl =
  process.env.NEXT_PUBLIC_RPC_URL || "http://localhost:5050";

// TODO: Configurable network for transaction links to voyager and the like
export const network = "goerli";

export const defaultProvider = new Provider({
  baseUrl: rpcUrl,
  feederGatewayUrl: "feeder_gateway",
  gatewayUrl: "gateway",
});

export const voyagerBaseUrl = "https://goerli.voyager.online/";
