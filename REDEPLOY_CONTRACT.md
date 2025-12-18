# Redeploying Updated Contract to Mainnet

This guide will help you redeploy your updated TeamAssignment contract with the commit-reveal scheme.

## ⚠️ Important Notes

- **Contract Address Stays the Same**: Since your contract is deployed to your account (`0x8d75e1dff5f8af66`), the address will remain the same after redeployment
- **Mainnet Costs Real FLOW**: Make sure you have enough FLOW tokens (usually 0.01-0.1 FLOW for contract updates)
- **No Frontend Changes Needed**: The contract address in `.env.local` stays the same

## Step-by-Step Instructions

### Step 1: Verify You Have Enough FLOW Tokens

Check your mainnet account balance:
```bash
cd /Users/joshbrodie/flow-nba-assignment
flow accounts get 0x8d75e1dff5f8af66 --network mainnet
```

You need at least **0.01 FLOW** for the contract update.

### Step 2: Verify Your Contract File

Make sure the updated contract is in place:
```bash
cat cadence/contracts/TeamAssignment.cdc | head -20
```

You should see the commit-reveal scheme comments at the top.

### Step 3: Deploy the Updated Contract

Deploy to mainnet:
```bash
cd /Users/joshbrodie/flow-nba-assignment
flow deploy --network mainnet
```

**What to expect:**
- Flow CLI will compile the contract
- It will update the contract at your account address
- You'll see output like: "Contract TeamAssignment deployed to 0x8d75e1dff5f8af66"
- The contract address stays the same: `0x8d75e1dff5f8af66`

### Step 4: Verify Deployment

1. **Check on Flowscan**:
   - Go to: https://flowscan.io/account/0x8d75e1dff5f8af66
   - Verify the contract code shows the commit-reveal functions

2. **Test the Contract** (Optional):
   - You can query the contract to verify it's working:
   ```bash
   flow scripts execute cadence/scripts/get_assignments.cdc \
     --network mainnet \
     --arg String:0x8d75e1dff5f8af66
   ```

### Step 5: Test the Frontend

1. **Start your local dev server**:
   ```bash
   npm run dev
   ```

2. **Test the assignment flow**:
   - Connect your wallet
   - Enter usernames
   - Click "START THE BREAK..."
   - You should see **two transactions** in your wallet:
     - First: Commit transaction
     - Second: Reveal transaction (automatic)
   - Assignments should appear as before

### Step 6: Update Production (if deployed)

If you have the frontend deployed (e.g., on Vercel):
- **No changes needed** - the contract address is the same
- The frontend will automatically use the updated contract
- You may want to clear browser cache if you see any issues

## Troubleshooting

### Error: "Insufficient balance"
- You need more FLOW tokens in your mainnet account
- Buy FLOW tokens or transfer from another account

### Error: "Contract update failed"
- Check that your private key in `flow.json` is correct
- Verify you have the correct permissions on the account
- Make sure the contract syntax is valid (no compilation errors)

### Frontend shows old behavior
- Clear browser cache
- Hard refresh (Cmd+Shift+R on Mac, Ctrl+Shift+R on Windows)
- Check browser console for errors

### Transactions fail
- Make sure you're on mainnet in your wallet
- Verify you have enough FLOW for gas fees
- Check that the contract address in `.env.local` matches your account

## What Changed?

The contract now uses:
- ✅ **Commit phase**: `commitAssignment()` - stores data and commits to block height
- ✅ **Reveal phase**: `revealAndAssign()` - uses randomness from later block
- ✅ **Provably fair**: No more `revertibleRandom()`, uses commit-reveal scheme

The frontend automatically handles both phases, so users see no difference!

## Verification Checklist

- [ ] Contract deployed successfully
- [ ] Contract address verified on Flowscan
- [ ] Local frontend tested and working
- [ ] Two transactions appear in wallet (commit + reveal)
- [ ] Assignments appear correctly
- [ ] Production deployment updated (if applicable)

## Need Help?

- Flow Mainnet Docs: https://docs.onflow.org/
- Flowscan: https://flowscan.io/account/0x8d75e1dff5f8af66
- Check transaction status: https://flowscan.io

