import { useContract } from "@starknet-react/core";
import { Abi } from "starknet";

import Source from "../../public/Multisig.json";

export function useMultisigContract(address: string) {
  return useContract({
    abi: Source.abi as Abi,
    address: address,
  });
}
