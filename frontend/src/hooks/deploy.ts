import { useStarknet } from "@starknet-react/core";
import { useCallback, useEffect, useState } from "react";
import {
  Abi,
  CompiledContract,
  Contract,
  ContractFactory,
  Provider,
  RawCalldata,
  validateAndParseAddress,
} from "starknet";
import { BigNumberish } from "starknet/dist/utils/number";
import { state } from "~/state";

interface UseContractFactoryArgs {
  compiledContract?: CompiledContract;
  abi?: Abi;
}

interface DeployArgs {
  constructorCalldata: RawCalldata;
  addressSalt?: BigNumberish;
}

interface UseContractFactory {
  factory?: ContractFactory;
  deploy: ({
    constructorCalldata,
    addressSalt,
  }: DeployArgs) => Promise<Contract | undefined>;
  contract?: Contract;
}

export function useContractFactory({
  compiledContract,
  abi,
}: UseContractFactoryArgs): UseContractFactory {
  const { library } = useStarknet();
  const [factory, setFactory] = useState<ContractFactory | undefined>();
  const [contract, setContract] = useState<Contract | undefined>();

  useEffect(() => {
    if (compiledContract) {
      setFactory(
        new ContractFactory(compiledContract, library as Provider, abi)
      );
    }
  }, [compiledContract, library, abi]);

  const deploy = useCallback(
    async ({ constructorCalldata, addressSalt }: DeployArgs) => {
      if (factory) {
        const contract = await factory.deploy(constructorCalldata, addressSalt);
        state.multisigs.push({
          address: validateAndParseAddress(contract.address),
          transactionHash: contract.deployTransactionHash,
        });
        setContract(contract);
        return contract;
      }
      return undefined;
    },
    [factory]
  );

  return { factory, contract, deploy };
}
