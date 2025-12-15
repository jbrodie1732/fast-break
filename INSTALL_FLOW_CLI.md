# Installing Flow CLI

You need to install Flow CLI to deploy your smart contract. Here are your options:

## Option 1: Using Homebrew (Easiest for macOS)

```bash
brew install flow-cli
```

## Option 2: Manual Installation (if Homebrew doesn't work)

Run this command (it will ask for your password):

```bash
sh -ci "$(curl -fsSL https://storage.googleapis.com/flow-cli/install.sh)"
```

## Option 3: Download Binary Directly

1. Go to https://github.com/onflow/flow-cli/releases
2. Download the latest macOS binary
3. Extract and move to `/usr/local/bin/` or add to your PATH

## Verify Installation

After installing, verify it works:

```bash
flow version
```

You should see something like: `flow version v0.41.2`

## Next Steps

Once Flow CLI is installed, continue with the deployment steps in `SETUP.md`.

