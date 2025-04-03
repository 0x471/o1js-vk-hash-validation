# Mina zkApp: Vk Hash Validation

This project demonstrates verification key validation in o1js by attempting to update a zkApp's verification key with a mismatched hash.

## Project Structure

```
.
├── src/
│   ├── vkValidation.ts    # zkApps
│   └── scripts/          # Interaction scripts (Local Blockchain & Devnet)
│       ├── deploy-selfupdater.ts
│       ├── interact.ts
│       └── interact-devnet.ts
├── config.json          # Deployment configuration
```

## Prerequisites

1. Node.js >= 18.14.0
2. o1js >= 2.0.0
3. A funded Mina account (for Devnet deployment)

## Available Scripts

### Local Testing
```bash
npm run interact-local
```
This script runs the verification key update test on a local blockchain.

### Devnet Deployment
```bash
npm run deploy
```
This script deploys the zkApp to devnet using the configuration from `config.json`.

### Devnet Interaction
```bash
npm run interact-devnet
```
This script attempts to update the verification key on the deployed zkApp.

## Example Output

After running the local test, you'll see output similar to:
```
original verification key data: [data]
original verification key hash: [hash]
original verification key on chain: [key]
attempting to set mismatched verification key
Transaction succeeded (unexpected)
verification key after failed update: [key]
```

## License

[Apache-2.0](LICENSE)
