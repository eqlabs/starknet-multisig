# Starsign - Starknet Multisig Frontend

This page describes the used frontend implementation for the project, from a developer's perspective.

## Getting Started

Run the development server:

```
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Local testing

You can easily test Starsign by running a [local Starknet testnet](https://github.com/Shard-Labs/starknet-devnet). This guide assumes that you have Docker installed on your machine.

### X86
```bash
docker run -p 127.0.0.1:5050:5050 -it shardlabs/starknet-devnet:latest --gas-price=0
```

### ARM
```bash
docker run -p 127.0.0.1:5050:5050 -it shardlabs/starknet-devnet:latest-arm --gas-price=0
```
