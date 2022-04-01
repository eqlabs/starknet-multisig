# Starknet multisig

Multi-signature functionality for <a href='https://starknet.io/what-is-starknet/' target='_blank'>StarkNet</a>.

> ## ⚠️ WARNING! ⚠️
>
> This repo contains highly experimental code which relies on other highly experimental code.
> Expect rapid iteration.
> **Do not use in production.**

## Current preliminary version

The current version is a preliminary version. This version consists of three pieces:

- Cairo contract code
- Unit tests for testing all the multisig functionality
- A _very_ rough UI for testing a multisig

The current version supports only on-chain multi-signatures. The multisig is a separate contract, which is called through your regular account contract (wallet).

## Usage

### Network

You can try either in alpha network (Goerli) or mainnet, but alpha is highly recommended since it's a lot faster. Do note that _faster_ means that it may take only 10 minutes for a transaction to go through, depending on the network conditions.

Using the Goerli network means you operate on Goerli through a separate StarkNet alpha network. You do not interact directly with the Goerli network.

Currently StarkNet _devnet_ doesn't work properly with this version.

### What is there to test?

Currently you can test the multisig with only one target contract. The target contract is a trivial contract which keeps track of some balance and has unrestricted functionality to update the balance. You can't change the target contract (without some development work).

If you want to have a fresh start, just refresh your browser window. No data is stored between sessions.

### Fees

You do not need any assets in your wallets in order to use this functionality. StarkNet does not currently enforce fees and subsidises Goerli fees.

### UI

The UI can be found at <a href='http://starknet-multisig.vercel.app' target='_blank'>http://starknet-multisig.vercel.app</a>.

How to use:

1. If you don't have it yet, get the Argent X browser extension (not the regular Argent wallet!). Change the network to Goerli. Create some accounts
1. Choose what the threshold is and how many signers there can be in total. The threshold states how many signers have to sign a transaction before it can be executed. The total number of signers states how many signers the contract supports in total.
1. Enter owner addresses
1. Deploy the multisig
1. Enter some number in "Target balance" and submit the transaction
1. Confirm the transaction with at least the _threshold_ amount of signer accounts
1. Execute the transaction. The displayed current balance in Target contract should reflect the changed balance.

### Warnings

You should wait for each transaction to get status "ACCEPTED_ON_L2" (or L1) before proceeding with the next transaction. This can take some time. It may also take a bit of time for the UI to receive the latest data from the blockchain after a transaction has passed, so be patient.

There are very few UI validations currently. Enter sensible data in if you want to get sensible data out.

The network also doesn't provide any sensible error messages. If some of your transactions are rejected, you just have to figure out what failed in your setup.

## Future development

In near future we'll get here:

- A clearer UI
- Possibility to choose an arbitrary target transaction
- Possibly an option to use an account contract as multisig
- Possibly off-chain signatures

### Multisig implementation options

The current implementation uses Option 1 in the following image. Option 2 is in our roadmap for near future.

<img src="multisig_options.png" alt="options" width="800"/>

## Fluffy stuff

Created by <a href='https://equilibrium.co' target='_blank'>Equilibrium</a>.

For support, free to poke LauriP#8728 at <a href='https://discord.gg/uJ9HZTUk2Y' target='_blank'>StarkNet Discord</a>.
