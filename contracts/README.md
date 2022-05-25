# Starknet-multisig contract

This page contains information about the used StarkNet Cairo contracts.

These instructions are only needed if you want to develop on top of the project - normal users don't need to touch this part.

## Contracts

The main contracts used are:

- Multisig.cairo: main multisig functionality
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

After that, run the _devnet_ in one tab (`npm run local`) and run the unit tests in another tab with `npx hardhat test`.

Tested to be working at least with devnet version 0.1.19.

### Deployment

Usually there is no need to manually deploy anything. But if needed, here are instructions how to deploy a multisig manually to Goerli alpha network:

1. Compile all contracts: `npm run compile`
1. Deploy an account contract: `npx hardhat starknet-deploy-account --starknet-network alpha --wallet OpenZeppelin --wait`
1. Deploy the target contract: `npx hardhat starknet-deploy --starknet-network alpha ./starknet-artifacts/contracts/mock/Target.cairo --wait`
1. Deploy the multisig. Remember to change the parameter to be your own account (in ArgentX if testing through UI): `npx hardhat starknet-deploy --starknet-network alpha ./starknet-artifacts/contracts/Multisig.cairo --inputs "1 0x011833a87cdffb58c2bde4af8708f16c744656666ff97506fd302a7bbd56d27f 1" --wait`

## Acknowledgements

Thanks to Sam Barnes for creating the [initial multisig code](https://github.com/sambarnes/cairo-multisig) and offering it available.

## Fluffy stuff

Created by https://equilibrium.co
