# 🚀 Quick Start Guide - Start Here!

## ✅ What's Already Done
- ✅ Node.js dependencies installed
- ✅ Flow CLI installed (v2.12.0)
- ✅ Project structure created

## ✅ Current Configuration

**Account Address:** `0x66cf7fef7cdfe96a`  
**Contract Address:** `0x66cf7fef7cdfe96a`  
**Network:** Testnet

All configuration files have been updated with your new account details.

## 📋 Next Steps (Do These Now)

### Step 0: Fund Your Account (IMPORTANT!)

Your account needs more FLOW tokens to deploy the contract. Visit:
**https://testnet-faucet.onflow.org/fund-account?address=66cf7fef7cdfe96a**

You need at least 0.01 FLOW tokens.

### Step 1: Get a Flow Account (Already Done!)

You need a Flow account to deploy the contract. Choose one:

**Option A: Use Flow Testnet Faucet (Easiest)**
1. Go to: https://testnet-faucet.onflow.org/
2. Click "Create Account" or "Get Started"
3. Save your account address and private key securely
4. You'll get free testnet FLOW tokens automatically

**Option B: Create Account with Flow CLI**
```bash
flow accounts create --key YOUR_PRIVATE_KEY --sig-algo ECDSA_P256 --hash-algo SHA3_256 --network testnet
```

### Step 2: Deploy the Contract

After funding your account, deploy the contract:

```bash
cd /Users/joshbrodie/flow-nba-assignment
flow deploy --network testnet
```

The contract will be deployed to: `0x66cf7fef7cdfe96a`

### Step 3: Frontend is Already Configured ✅

The `.env.local` file is already set up with your contract address: `0x66cf7fef7cdfe96a`

### Step 4: Update Usernames (Optional)

Edit `data/usernames.json` with your 30 actual NBA Top Shot usernames.

### Step 5: Run the App!

```bash
npm run dev
```

Then open: http://localhost:3000

### Step 6: Use the App

1. Click "Connect Wallet" 
2. Connect your Flow wallet (Blocto, Ledger, etc.)
3. Click "🎲 Assign Teams (One Click)"
4. Approve the transaction
5. Watch assignments appear in real-time! 🎉

## 🆘 Need Help?

- See `SETUP.md` for detailed instructions
- See `DEPLOYMENT.md` for deployment details
- Check browser console for errors
- Make sure you have testnet FLOW tokens: https://testnet-faucet.onflow.org/

## 📝 Checklist

- [x] Flow account created: `0x66cf7fef7cdfe96a`
- [x] Updated `flow.json` with account details
- [ ] **Fund account with testnet FLOW tokens** ⚠️ (Required!)
- [ ] Deployed contract to testnet
- [x] `.env.local` configured with contract address
- [ ] Updated `data/usernames.json` with real usernames (optional)
- [ ] Started app with `npm run dev`
- [ ] Connected wallet in browser
- [ ] Successfully assigned teams! 🎉

