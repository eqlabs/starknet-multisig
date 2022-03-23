import { useCallback, useEffect, useState } from "react";
import {
  Abi,
  CompiledContract,
  Contract,
  ContractFactory,
  Provider,
  RawCalldata,
} from "starknet";
import { BigNumberish } from "starknet/dist/utils/number";
import {
  useStarknetTransactionManager,
  useStarknet,
} from "@starknet-react/core";

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
}

export function useContractFactory({
  compiledContract,
  abi,
}: UseContractFactoryArgs): UseContractFactory {
  const { library } = useStarknet();
  const { addTransaction } = useStarknetTransactionManager();
  const [factory, setFactory] = useState<ContractFactory | undefined>();

  useEffect(() => {
    if (compiledContract) {
      setFactory(
        new ContractFactory(compiledContract, library as Provider, abi)
      );
    }
  }, [compiledContract, abi, library]);

  const deploy = useCallback(
    async ({ constructorCalldata, addressSalt }: DeployArgs) => {
      if (factory) {
        const contract = await factory.deploy(constructorCalldata, addressSalt);
        addTransaction({
          status: "TRANSACTION_RECEIVED",
          transactionHash: contract.deployTransactionHash ?? "",
        });
        return contract;
      }
      return undefined;
    },
    [factory]
  );

  return { factory, deploy };
}
