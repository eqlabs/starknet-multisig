# Starknet-multisig contract

This page contains information about the used StarkNet Cairo contracts.

These instructions are only needed if you want to develop on top of the project - normal users don't need to touch this part.

## Contracts

The contracts are:

- Multisig.cairo: main multisig functionality
- util.cairo: various helper functionality
- Target.cairo: a mock of the target contract for the multisig, used in testing

## Used components

- [Starknet Hardhat plugin](https://github.com/Shard-Labs/starknet-hardhat-plugin)
- [Starknet devnet](https://github.com/Shard-Labs/starknet-devnet), a local Starknet instance

## Usage

Recommended operating system is Ubuntu. If on Windows, use WSL2.

Installation:

```
yarn
python3.7 -m venv .venv
source ./.venv/bin/activate
```

Follow the [Cairo installation instructions](https://www.cairo-lang.org/docs/quickstart.html).
After that, inside the virtual environment:

- Install Cairo devnet (local blockchain) `python -m pip install starknet-devnet`
- Compile the contracts: `npm run compile`
- Run the devnet: `npm run local`
- Open another venv tab and run the unit tests with `npx hardhat test`

Tested to be working at least with devnet version 0.2.6.

## Acknowledgements

Thanks to Sam Barnes for creating the [initial multisig code](https://github.com/sambarnes/cairo-multisig) and offering it available.

## Fluffy stuff

Created by https://equilibrium.co
