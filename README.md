# Starknet-multisig

Multi-signature functionality for StarkNet.

> ## ⚠️ WARNING! ⚠️
>
> This repo contains highly experimental code which relies on other highly experimental code.
> Expect rapid iteration.
> **Do not use in production.**

## Current preliminary version

The current version is a very preliminary version. This version consists of three pieces:

- Cairo contract code, with an OpenZeppelin account contract
- Unit tests for testing all the multisig functionality
- A _very_ rough UI for testing an already deployed multisig

The current version supports only on-chain multi-signatures. The multisig is a separate contract, which is called through your regular account contract (wallet).

Check the folders `frontend` and `contracts` for more information.

## Usage

You can test the current version by deploying the needed contracts (see <a href='contracts/README.md'>contract readme</a> for instructions). Remember to deploy the MultiSig with your ArgentX account address as parameter, so it becomes the multisig owner. The multisig is a minimal 1 out of 1 multisig.

After deployment, set the contract address in `frontend/src/components/hooks/multisigContractHook.ts` and modify the parameters in `frontend/src/components/MultisigSettings.tsx`.

Run the UI and click buttons. Note that each transaction may take about 20 minutes to complete.

## Future development

In near future we'll get here:

- A real UI, with possibility to deploy a new multisig
- Possibly an option to use an account contract as multisig
- Possibly off-chain signatures

### Multisig implementation options

<img src="multisig_options.png" alt="options" width="800"/>

## Fluffy stuff

Created by https://equilibrium.co
