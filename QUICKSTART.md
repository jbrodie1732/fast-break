# Quick Start Guide

## Prerequisites

- Node.js 18+ installed
- A Flow wallet (Blocto, Ledger, or FCL-compatible)
- Flow CLI (for contract deployment)

## Setup Steps

### 1. Install Dependencies

```bash
cd flow-nba-assignment
npm install
```

### 2. Configure Your Contract Address

Create a `.env.local` file:

```bash
cp .env.example .env.local
```

Edit `.env.local` and add your deployed contract address:
```
NEXT_PUBLIC_CONTRACT_ADDRESS=0xYOUR_CONTRACT_ADDRESS
```

### 3. Update Usernames

Edit `data/usernames.json` and replace the placeholder usernames with your actual 30 NBA Top Shot usernames.

### 4. Deploy the Contract (First Time Only)

See `DEPLOYMENT.md` for detailed deployment instructions.

Quick version:
```bash
# Install Flow CLI
sh -ci "$(curl -fsSL https://storage.googleapis.com/flow-cli/install.sh)"

# Update flow.json with your account details
# Then deploy:
flow deploy --network testnet
```

### 5. Run the App

```bash
npm run dev
```

Open http://localhost:3000 in your browser.

### 6. Use the App

1. Click "Connect Wallet" to connect your Flow wallet
2. Click "🎲 Assign Teams (One Click)" button
3. Approve the transaction in your wallet
4. Watch assignments appear in real-time!
5. View the transaction on Flowscan using the provided link

## How It Works

- **One Click**: Single button click triggers the entire assignment process
- **Real-Time**: Assignments appear as the transaction processes on-chain
- **On-Chain Randomness**: Uses Flow's native `revertibleRandom()` function
- **No Duplicates**: Each username and team is removed from the pool after assignment
- **Permanent Record**: All assignments are stored on the Flow blockchain

## Troubleshooting

### "Contract not found" error
- Make sure you've deployed the contract and updated `.env.local`
- Verify the contract address is correct

### Transaction fails
- Ensure you have enough FLOW tokens for gas
- Check that usernames and teams arrays have exactly 30 items each
- Verify you're connected to the correct network (testnet/mainnet)

### Events not showing
- Check browser console for errors
- Verify the transaction was successful on Flowscan
- Make sure the contract address in `.env.local` matches your deployment

## Next Steps

- Customize the UI styling in `app/page.tsx`
- Add more features like assignment history
- Deploy to mainnet when ready for production

