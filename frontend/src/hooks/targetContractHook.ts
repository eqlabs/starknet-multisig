import { useContract } from "@starknet-react/core";
import { Abi } from "starknet";

import Source from "../../public/Target.json";

export function useTargetContract(address: string) {
  return useContract({
    abi: Source.abi as Abi,
    address: address,
  });
}
