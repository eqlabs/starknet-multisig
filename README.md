# Starknet multisig

Multi-signature functionality for [StarkNet](https://starknet.io/what-is-starknet).

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

### Functionality

The following functionality is supported:

- Create a new multisig contract with the following parameters:
  - List of signer addresses
  - Multisig threshold
- Submit a transaction
- Confirm a transaction
- Execute a transaction
- Revoke a confirmation
- Change the list of signers and threshold

### Audit

The contract code **has not been audited**. An audit is scheduled for September 2022.

## Future development

In near future we'll get here:

- A real UI
- Possibly an option to use an account contract as multisig
- Possibly off-chain signatures

### Multisig implementation options

The current implementation uses Option 1 in the following image. Option 2 is in our roadmap for near future.

<img src="multisig_options.png" alt="options" width="800"/>

## Fluffy stuff

Created by [Equilibrium](https://equilibrium.co).

If you have any question, feel free to [join our Discord](https://discord.gg/BZbrRbSd2f).
