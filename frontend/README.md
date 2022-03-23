# Starknet multisig frontend

This page describes the used frontend implementation for the project.

## Getting Started

First, run the development server:

```
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Current status

The frontend is the dumbest possible version of a UI with minimal functionality. It has the following functionality:

- See the amount of transactions in a pre-deployed multisig contract (in Goerli alpha network)
- Submit a new transaction to the multisig (works only if you're listed as an owner for the multisig). Change code if you want to change the parameters
- Confirm the latest transaction in the multisig
- Execute the latest transaction in the multisig
