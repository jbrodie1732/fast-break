# Deployment Guide

## Step 1: Install Flow CLI

```bash
sh -ci "$(curl -fsSL https://storage.googleapis.com/flow-cli/install.sh)"
```

Or using Homebrew (macOS):
```bash
brew install flow-cli
```

## Step 2: Create a Flow Account

If you don't have a Flow account yet:

```bash
# For testnet
flow accounts create --key YOUR_PRIVATE_KEY --sig-algo ECDSA_P256 --hash-algo SHA3_256 --network testnet
```

Or use Flow's web wallet at https://testnet-faucet.onflow.org/

## Step 3: Update flow.json

Edit `flow.json` and update:
- Your account address
- Your private key (keep this secure!)

## Step 4: Deploy the Contract

```bash
# Deploy to testnet
flow deploy --network testnet

# Or deploy to mainnet (be careful!)
flow deploy --network mainnet
```

After deployment, note the contract address from the output.

## Step 5: Update Frontend Configuration

1. Create a `.env.local` file:
```bash
cp .env.example .env.local
```

2. Update `.env.local` with your deployed contract address:
```
NEXT_PUBLIC_CONTRACT_ADDRESS=0xYOUR_ACTUAL_CONTRACT_ADDRESS
```

3. Also update `lib/flow.config.ts` if needed (the env variable should handle it, but you can set a default).

## Step 6: Update Usernames

Edit `data/usernames.json` with your actual 30 NBA Top Shot usernames.

## Step 7: Install Dependencies and Run

```bash
npm install
npm run dev
```

Visit http://localhost:3000 and connect your Flow wallet!

## Testing on Testnet

1. Get testnet FLOW tokens from: https://testnet-faucet.onflow.org/
2. Connect your testnet wallet
3. Click "Assign Teams" and approve the transaction
4. Watch the real-time assignments appear!

## Important Notes

- **Testnet vs Mainnet**: Always test on testnet first!
- **Gas Fees**: Transactions require FLOW tokens for gas
- **Contract Address**: Keep your contract address secure and documented
- **Private Keys**: Never commit private keys to version control

