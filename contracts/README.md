# Starknet-multisig

Multi-signature functionality for StarkNet.

> ## ⚠️ WARNING! ⚠️
>
> This repo contains highly experimental code which relies on other highly experimental code.
> Expect rapid iteration.
> **Do not use in production.**

## Current preliminary version

The current version is a preliminary version without a user interface. This version consists of two pieces:

- Cairo contract code, with an OpenZeppelin account contract
- Unit tests for testing all the multisig functionality

The current version supports on-chain multi-signatures through an account contract.

### Used components

- [Starknet Hardhat plugin](https://github.com/Shard-Labs/starknet-hardhat-plugin)
- [Starknet devnet](https://github.com/Shard-Labs/starknet-devnet), a local Starknet instance

## Future development

In near future we'll get here:

- A real UI
- Possibly an option to use an account contract as multisig
- Possibly off-chain signatures

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

## Acknowledgements

Thanks to Sam Barnes for creating the [initial multisig code](https://github.com/sambarnes/cairo-multisig) and offering it available.

## Fluffy stuff

Created by https://equilibrium.co
