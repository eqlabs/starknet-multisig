# Starknet-multisig contract

This page contains information about the used StarkNet Cairo contracts.

## Contracts

The main contracts used are:

- MultiSig.cairo: main multisig functionality
- Account.cairo: OpenZeppelin account contract
- Target.cairo: a mock of the target contract for the multisig

## Used components

- [Starknet Hardhat plugin](https://github.com/Shard-Labs/starknet-hardhat-plugin)
- [Starknet devnet](https://github.com/Shard-Labs/starknet-devnet), a local Starknet instance

## Usage

Recommended operating system is Ubuntu. If on Windows, use WSL2.

```
yarn
python3.7 -m venv .venv
source ./.venv/bin/activate
python -m pip install cairo-nile
python -m pip install starknet-devnet

```

Inside the virtual environment:

After that, run the _devnet_ in one tab (`starknet-devnet`) and run the unit tests in another tab with `npx hardhat test`.

### Deployment

Instructions how to deploy this to Goerli alpha network:

1. Compile all contracts: `npx hardhat starknet-compile`
1. Deploy an account contract: `npx hardhat starknet-deploy-account --starknet-network alpha --wallet OpenZeppelin --wait`
1. Deploy the target contract: `npx hardhat starknet-deploy --starknet-network alpha ./starknet-artifacts/contracts/mock/Target.cairo --wait`
1. Deploy the multisig. Remember to change the parameter to be your own account (in ArgentX if testing through UI): `npx hardhat starknet-deploy --starknet-network alpha ./starknet-artifacts/contracts/MultiSig.cairo --inputs "1 0x011833a87cdffb58c2bde4af8708f16c744656666ff97506fd302a7bbd56d27f 1" --wait`

## Acknowledgements

Thanks to Sam Barnes for creating the [initial multisig code](https://github.com/sambarnes/cairo-multisig) and offering it available.

## Fluffy stuff

Created by https://equilibrium.co
