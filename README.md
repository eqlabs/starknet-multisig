# Starknet-multisig

Multi-signature functionality for StarkNet.

> ## ⚠️ WARNING! ⚠️
>
> This repo contains highly experimental code which relies on other highly experimental code.
> Expect rapid iteration.
> **Do not use in production.**

## Current preliminary version

The current version is a preliminary version. This version consists of three pieces:

- Cairo contract code, with an OpenZeppelin account contract
- Unit tests for testing all the multisig functionality
- A _very_ rough UI for testing a new multisig

The current version supports only on-chain multi-signatures. The multisig is a separate contract, which is called through your regular account contract (wallet).

Check the folders <a href='frontend/README.md'>frontend</a> and <a href='contracts/README.md'>contract</a> for more information.

## Usage

### Network

You can try either in alpha network (Goerli) or mainnet, but alpha is highly recommended since it's a lot faster. Do note that _faster_ means that it may take only 10 minutes for a transaction to go through, depending on the network conditions.

### What is there to test?

Currently you can test the multisig with only one target contract. The target contract is a trivial contract which keep track of some balance and has unrestricted functionality to update the balance.

If you want to have a fresh start, just refresh your browser window. No data is stored between sessions.

### UI

The UI can be found at <a href='http://starknet-multisig.vercel.app' target='_blank'>http://starknet-multisig.vercel.app</a>.

1. If you don't have yet, get the Argent X browser extension (not the regular Argent wallet!). Change the network. Create some accounts
1. Choose what is the threshold and how many signers in total. The threshold states how many signers have to sing a transaction before it can be executed. The total number states how many signers there are in total.
1. Enter owner addresses
1. Deploy the multisig
1. Enter some number in "Target balance" and submit the transaction
1. Confirm the transaction with at least _threshold_ amount of signer accounts
1. Execute the transaction. The displayed current balance in Target contract should reflect the changed balance.

Note: You should wait for each transaction to get status "ACCEPTED_ON_L2" before proceeding with the next transaction. This can take some time.

### Warnings

There are very few validations currently. Enter sensible data if you want to get sensible data out.

The network also doesn't provide any sensible error messages, so if some of your transactions are rejected, you just have to figure out what failed in your setup.

## Future development

In near future we'll get here:

- A real UI, with possibility to choose an arbitrary target transaction
- Possibly an option to use an account contract as multisig
- Possibly off-chain signatures

### Multisig implementation options

The current implementation uses Option 1 in the following image. Option 2 is in our roadmap for near future.

<img src="multisig_options.png" alt="options" width="800"/>

## Fluffy stuff

Created by https://equilibrium.co
