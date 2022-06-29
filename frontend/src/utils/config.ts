import { Provider } from "starknet";

export const rpcUrl = process.env.RPC_URL || "http://localhost:5050";

export const defaultProvider = new Provider({
  baseUrl: rpcUrl,
  feederGatewayUrl: "feeder_gateway",
  gatewayUrl: "gateway",
});
