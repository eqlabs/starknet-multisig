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

You can test in the alpha network (Goerli). It may take 10 minutes (or more) for a transaction to go through, depending on the network conditions.

Using the Goerli network means you operate on Goerli through a separate StarkNet alpha network. You do not interact directly with the Goerli network.

### What is there to test?

Currently you can test the multisig with an arbitrary target contract. You can target any existing contract's function, with any parameters.

You can specify how many signers need to confirm any transaction, and how many signers there are in total.

If you want to have a fresh start, just refresh your browser window. No data is stored between sessions.

### Fees

You do not need any assets in your wallets in order to use this functionality. StarkNet does not currently enforce fees and subsidises Goerli fees.

### UI

The UI can be found at <a href='http://starknet-multisig.vercel.app' target='_blank'>http://starknet-multisig.vercel.app</a>.

How to use:

1. If you don't have it yet, get the Argent X browser extension (not the regular Argent wallet!). Change the network to Goerli. Create some accounts
1. Choose what the threshold is and how many signers there can be in total. The threshold states how many signers have to sign a transaction before it can be executed. The total number of signers states how many signers the contract supports in total.
1. Enter signer addresses
1. Deploy the multisig
1. Enter the target contract address
1. Enter the target function name
1. Enter the target function parameters. See below for more details
1. Confirm the transaction with at least the _threshold_ amount of signer accounts
1. Execute the transaction with any of the signer accounts

### Warnings

You should wait for each transaction to get status "ACCEPTED_ON_L2" (or L1) before proceeding with the next transaction. This can take some time. It may also take a bit of time for the UI to receive the latest data from the blockchain after a transaction has passed, so be patient.

There are very few UI validations currently. Put sensible data in if you want to get sensible data out.

Currently no sensible error messages are retrieved. If some of your transactions are rejected, you just have to figure out what failed in your setup.

### Target function parameters

For functions with a single parameter, simply enter the parameter. For multiple parameters, you should separate the parameters by space. For example: `5 6 34` if the function takes in three parameters.

If your function takes in an _array_ parameter you have to flatten the array and provide its length before the values. So, for example, if your array is `[5, 6, 34]` you should enter parameters `3 5 6 34`.

All parameters need to be in integer format. If you need for example a _string_ parameter, you need to convert it first.

### Example test

If you just want to test the multisig functionality, you can use a previously deployed test contract with the following information:

- Target contract address: `0x559c07ca27a08d1b0c8783b7dc588b4ed384e75c7974c5d3e43c96879b22216`
- Target function name: `set_balance`
- Target function parameters: any integer (for example `123`)

After you have successfully executed your test transaction, you can read the contract's balance with the `get_balance` function at https://goerli.voyager.online/contract/0x559c07ca27a08d1b0c8783b7dc588b4ed384e75c7974c5d3e43c96879b22216#readContract

## Future development

In near future we'll get here:

- A clearer UI
- Possibility to transfer value (once StarkNet has the concept of 'value')
- Possibly an option to use an account contract as multisig
- Possibly off-chain signatures

### Multisig implementation options

The current implementation uses Option 1 in the following image. Option 2 is in our roadmap for near future.

<img src="multisig_options.png" alt="options" width="800"/>

## Fluffy stuff

Created by <a href='https://equilibrium.co' target='_blank'>Equilibrium</a>.

If you have any question, feel free to poke LauriP#8728 at <a href='https://discord.gg/uJ9HZTUk2Y' target='_blank'>StarkNet Discord</a>.
