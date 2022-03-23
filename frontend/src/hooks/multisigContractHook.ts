import { useContract } from "@starknet-react/core";
import { Abi } from "starknet";

import Source from "../contracts/MultiSig.json";

export function useMultisigContract() {
  return useContract({
    abi: Source.abi as Abi,
    address:
      // address of a multisig in alpha network. Useful only for the multisig owners
      "0x00f1d0460437602be0a938c7b9b0937a8fc614909335026923128dead09954c0",
  });
}
