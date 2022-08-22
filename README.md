# Starknet multisig

Multi-signature functionality for [StarkNet](https://starknet.io/what-is-starknet).

Contract npm package: [![npm version](https://badge.fury.io/js/starsign-multisig.svg)](https://badge.fury.io/js/starsign-multisig)

> ## ⚠️ WARNING! ⚠️
>
> This repo contains highly experimental code which relies on other highly experimental code.
> Expect rapid iteration.
> **Do not use in production.**

## Current version

The current version contains all basic multisig functionality. This version consists of two pieces:

- Cairo contract code
- Unit tests for testing all the multisig functionality

The current version supports only on-chain multi-signatures. The multisig is a separate contract, which is called through your regular account contract (wallet).

## Functionality

The following functionality is supported:

- Create a new multisig contract with the following parameters:
  - List of signer addresses
  - Multisig threshold
- Submit a transaction
- Confirm a transaction
- Execute a transaction
- Revoke a confirmation
- Change the list of signers and threshold

### Creating a new transaction

When creating a new transaction, you should call the `submit_transaction` function with the following parameters:

- `to`: Address of the transaction target
- `function_selector`: Name of the target function, decoded as an integer (felt)
- `calldata_len`: The amount of custom parameters to pass to the target function
- `calldata`: The custom parameters to pass to the target function
- `nonce`: Transaction nonce. Has to be +1 compared to the previous submitted transaction

Only signers of the multisig can submit a transaction.

### Confirming a transaction

Once a transaction has been submitted to the multisig, it needs to be confirmed by `threshold` amount of signers. To confirm a transaction as a signer, you should call the `confirm_transaction` function with the transaction `nonce` as parameter.

Only signers of the multisig can confirm a transaction.

### Executing a transaction

Once a transaction has been confirmed by `threshold` amount of signers, it can be executed by anyone - the executer does not have to be a signer. The execution is done by calling the `execute_transaction` function with the transaction `nonce` as parameter.

### Revoking a confirmation

If you, as a signer, have confirmed a transaction, but wish to revoke the confirmation, you can call the `revoke_confirmation` function with the transaction `nonce` as parameter.

### Changing the signers and threshold

There exist three functions for changing the signers and threshold:

- `set_threshold`
- `set_signers`
- `set_signers_and_threshold`

Only signers can change the threshold and the amount of signers. These actions need to go through the multisig itself, so you have to go through the `submit_transaction` function (setting the multisig contract itself as the transaction target).

## Audit

The contract code **has not been audited**. An audit is scheduled for September 2022.

# Future development

In near future we'll get here:

- A real UI
- Possibly an option to use an account contract as multisig
- Possibly off-chain signatures

## Multisig implementation options

The current implementation uses Option 1 in the following image. Option 2 is in our roadmap for near future.

<img src="multisig_options.png" alt="options" width="800"/>

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

Tested to be working at least with devnet version 0.2.10.

## Acknowledgements

Thanks to Sam Barnes for creating the [initial multisig code](https://github.com/sambarnes/cairo-multisig) and offering it available.

# Fluffy stuff

Created by [Equilibrium](https://equilibrium.co).

If you have any question, feel free to [join our Discord](https://discord.gg/BZbrRbSd2f).
