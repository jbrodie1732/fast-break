# Step-by-Step Setup Guide

Follow these steps in order to deploy and run your Flow NBA Team Assignment app.

## Step 1: Install Node.js Dependencies

```bash
cd /Users/joshbrodie/flow-nba-assignment
npm install
```

## Step 2: Install Flow CLI

You need Flow CLI to deploy the smart contract. Choose one method:

### Option A: Using the install script (Recommended)
```bash
sh -ci "$(curl -fsSL https://storage.googleapis.com/flow-cli/install.sh)"
```

### Option B: Using Homebrew (macOS)
```bash
brew install flow-cli
```

### Verify installation:
```bash
flow version
```

## Step 3: Create a Flow Account (if you don't have one)

### For Testnet (Recommended for testing):

1. Go to https://testnet-faucet.onflow.org/
2. Create an account and get testnet FLOW tokens
3. Note your account address

OR use Flow CLI:
```bash
flow accounts create --key YOUR_PRIVATE_KEY --sig-algo ECDSA_P256 --hash-algo SHA3_256 --network testnet
```

## Step 4: Configure flow.json

Edit `flow.json` and update with your account details:

```json
{
  "accounts": {
    "emulator-account": {
      "address": "YOUR_ACCOUNT_ADDRESS",
      "key": "YOUR_PRIVATE_KEY"
    }
  }
}
```

**⚠️ Security Note:** Never commit your private key to version control!

## Step 5: Deploy the Smart Contract

### Deploy to Testnet:
```bash
flow deploy --network testnet
```

After deployment, you'll see output like:
```
Deployed Contract: TeamAssignment to 0x1234567890abcdef
```

**Copy this contract address!** You'll need it in the next step.

## Step 6: Configure Frontend

1. Create `.env.local` file:
```bash
cp .env.example .env.local
```

2. Edit `.env.local` and add your contract address:
```
NEXT_PUBLIC_CONTRACT_ADDRESS=0xYOUR_CONTRACT_ADDRESS_HERE
```

Replace `0xYOUR_CONTRACT_ADDRESS_HERE` with the address from Step 5.

## Step 7: Update Usernames

Edit `data/usernames.json` and replace the placeholder usernames with your actual 30 NBA Top Shot usernames.

## Step 8: Run the Frontend

```bash
npm run dev
```

The app will start at: http://localhost:3000

## Step 9: Use the App

1. Open http://localhost:3000 in your browser
2. Click "Connect Wallet" and connect your Flow wallet (Blocto, Ledger, etc.)
3. Click "🎲 Assign Teams (One Click)" button
4. Approve the transaction in your wallet
5. Watch assignments appear in real-time!

## Troubleshooting

### "Contract not found" error
- Double-check your contract address in `.env.local`
- Make sure you deployed to the same network (testnet/mainnet) as configured in `lib/flow.config.ts`

### "Insufficient balance" error
- Get more testnet FLOW tokens from https://testnet-faucet.onflow.org/
- Make sure you're using a testnet account

### Transaction fails
- Check that you have exactly 30 usernames and 30 teams
- Verify your account has enough FLOW for gas fees
- Check the browser console for detailed error messages

### Flow CLI not found
- Make sure Flow CLI is installed and in your PATH
- Try restarting your terminal
- Verify with `flow version`

## Next Steps

- Test thoroughly on testnet before deploying to mainnet
- Customize the UI if desired
- Add your actual NBA Top Shot usernames
- Share with your community!

## Production Deployment

When ready for mainnet:

1. Update `lib/flow.config.ts` to use mainnet endpoints
2. Deploy contract to mainnet: `flow deploy --network mainnet`
3. Update `.env.local` with mainnet contract address
4. Make sure you have mainnet FLOW tokens for gas

