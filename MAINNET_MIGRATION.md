# Moving to Mainnet - Migration Guide

This guide will help you move Fast-BREAK from Flow testnet to mainnet.

## ⚠️ Important Considerations

**Before moving to mainnet:**
- Mainnet transactions cost **real FLOW tokens** (not testnet tokens)
- Transactions are **permanent** and **irreversible**
- Make sure your contract is thoroughly tested on testnet first
- Mainnet FLOW tokens have real value

## Step 1: Deploy Contract to Mainnet

### Prerequisites:
- You need a mainnet Flow account with FLOW tokens
- You need enough FLOW for contract deployment (usually 0.01-0.1 FLOW)

### Deploy:

1. **Update flow.json with your mainnet account**:
```json
{
  "accounts": {
    "mainnet-account": {
      "address": "YOUR_MAINNET_ADDRESS",
      "key": {
        "type": "hex",
        "index": 0,
        "signatureAlgorithm": "ECDSA_secp256k1",
        "hashAlgorithm": "SHA2_256",
        "privateKey": "YOUR_MAINNET_PRIVATE_KEY"
      }
    }
  },
  "deployments": {
    "mainnet": {
      "mainnet-account": ["TeamAssignment"]
    }
  }
}
```

2. **Deploy to mainnet**:
```bash
flow deploy --network mainnet
```

3. **Copy the contract address** from the output (it will be your mainnet account address)

## Step 2: Update Frontend Configuration

### Update `lib/flow.config.ts`:

Change from testnet to mainnet endpoints:

```typescript
fcl.config({
  "accessNode.api": "https://rest-mainnet.onflow.org",  // Changed from testnet
  "discovery.wallet": "https://fcl-discovery.onflow.org/mainnet/authn",  // Changed
  "app.detail.title": "Fast-BREAK",
  "app.detail.icon": "https://placekitten.com/g/200/200",
  "0xTeamAssignment": CONTRACT_ADDRESS,
});
```

### Update Environment Variable:

In Vercel (or your deployment platform):
- Update `NEXT_PUBLIC_CONTRACT_ADDRESS` to your mainnet contract address

For local development:
- Update `.env.local` with the mainnet contract address

## Step 3: Update Flowscan Links

The Flowscan link format is the same, just remove `/testnet`:

```typescript
// In app/page.tsx, change:
href={`https://testnet.flowscan.io/tx/${transactionId}`}
// To:
href={`https://flowscan.io/tx/${transactionId}`}
```

## Step 4: Test Thoroughly

1. **Test with small amounts first**
2. **Verify contract deployment** on Flowscan mainnet
3. **Test a single assignment** before doing all 30
4. **Check gas costs** - mainnet transactions cost real FLOW

## Step 5: Update Documentation

Update your README and any user-facing docs to mention:
- Users need **mainnet FLOW tokens** (not testnet)
- Transactions cost real money
- All transactions are permanent

## Cost Estimates

- **Contract deployment**: ~0.01-0.1 FLOW (one-time)
- **Per assignment transaction**: ~0.001-0.01 FLOW (depends on network congestion)
- **30 assignments**: ~0.03-0.3 FLOW total

## Security Checklist

- [ ] Contract thoroughly tested on testnet
- [ ] Mainnet account has sufficient FLOW tokens
- [ ] Private keys stored securely (never commit to Git)
- [ ] Users understand they need mainnet FLOW tokens
- [ ] Flowscan links updated to mainnet
- [ ] Environment variables updated in deployment platform

## Rollback Plan

If something goes wrong:
- You can deploy a new contract version
- Old contract data remains on-chain
- Consider versioning your contract (e.g., TeamAssignmentV2)

## Need Help?

- Flow Mainnet Docs: https://docs.onflow.org/
- Flow Mainnet Faucet: Not available - you need to buy FLOW tokens
- Flowscan Mainnet: https://flowscan.io

