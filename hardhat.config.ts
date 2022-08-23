import { HardhatUserConfig } from "hardhat/types";
import "@shardlabs/starknet-hardhat-plugin";

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
const config: HardhatUserConfig = {
  starknet: {
    venv: "active",
    network: "devnet",
    wallets: {},
  },
  networks: {
    devnet: {
      url: "http://127.0.0.1:5050/",
    },
  },
};

export default config;
