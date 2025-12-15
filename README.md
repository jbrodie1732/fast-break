# NBA Team Assignment on Flow

A decentralized application built on the Flow blockchain that randomly assigns NBA Top Shot usernames to NBA teams using Flow's on-chain randomness (VRF - Verifiable Random Function).

## Features

- ✅ **One-Click Assignment**: Assign all 30 usernames to 30 teams with a single button click
- ✅ **Real-Time Updates**: Watch assignments happen in real-time as the transaction processes
- ✅ **On-Chain Randomness**: Uses Flow's native `revertibleRandom()` for verifiable, unbiased randomness
- ✅ **On-Chain Storage**: All assignments are permanently recorded on the Flow blockchain
- ✅ **No Duplicates**: Each username and team is removed from the pool after assignment
- ✅ **Beautiful UI**: Modern, responsive interface with real-time animations

## Prerequisites

- Node.js 18+ and npm/yarn
- Flow CLI (optional, for local development)
- A Flow wallet (Blocto, Ledger, or other FCL-compatible wallet)

## Installation

1. Clone or navigate to the project directory:
```bash
cd flow-nba-assignment
```

2. Install dependencies:
```bash
npm install
```

3. Configure Flow:
   - Update `lib/flow.config.ts` with your deployed contract address
   - Replace `0xYOUR_CONTRACT_ADDRESS` with your actual contract address

4. Update usernames:
   - Edit `data/usernames.json` with your 30 NBA Top Shot usernames

## Deployment

### Deploy Smart Contract

1. Install Flow CLI:
```bash
sh -ci "$(curl -fsSL https://storage.googleapis.com/flow-cli/install.sh)"
```

2. Create a Flow account (if you don't have one):
```bash
flow accounts create
```

3. Deploy the contract:
```bash
flow deploy --network testnet
```

4. Update the contract address in `lib/flow.config.ts` and `lib/flow-interactions.ts`

### Run Frontend

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## How It Works

1. **Smart Contract** (`cadence/contracts/TeamAssignment.cdc`):
   - Uses Flow's `revertibleRandom()` function for on-chain randomness
   - Loops through all usernames, randomly selecting one and one team
   - Removes selected items from the pool to prevent duplicates
   - Emits events for each assignment
   - Stores all assignments on-chain

2. **Frontend** (`app/page.tsx`):
   - Connects to Flow wallet using FCL
   - Sends transaction with all usernames and teams
   - Subscribes to transaction events for real-time updates
   - Displays assignments as they happen

3. **Transaction Flow**:
   - User clicks "Assign Teams" button
   - Transaction is sent to Flow network
   - Contract executes loop, making random assignments
   - Events are emitted for each assignment
   - Frontend receives events and updates UI in real-time
   - Transaction is sealed and recorded on-chain

## Project Structure

```
flow-nba-assignment/
├── cadence/
│   ├── contracts/
│   │   └── TeamAssignment.cdc      # Main smart contract
│   ├── transactions/
│   │   └── assign_teams.cdc        # Transaction script
│   └── scripts/
│       └── get_assignments.cdc      # Read assignments script
├── app/
│   ├── page.tsx                     # Main UI component
│   ├── layout.tsx                   # App layout
│   └── globals.css                  # Global styles
├── lib/
│   ├── flow.config.ts               # Flow FCL configuration
│   └── flow-interactions.ts         # Flow interaction utilities
├── data/
│   ├── nba-teams.json               # List of 30 NBA teams
│   └── usernames.json               # List of 30 usernames
├── flow.json                        # Flow project configuration
└── package.json                     # Dependencies
```

## Customization

### Update Usernames

Edit `data/usernames.json` with your actual NBA Top Shot usernames.

### Change Network

Update the network in `lib/flow.config.ts`:
- Testnet: `https://rest-testnet.onflow.org`
- Mainnet: `https://rest-mainnet.onflow.org`

### Modify Teams

Edit `data/nba-teams.json` if you want to use different teams.

## Security Notes

- Flow's `revertibleRandom()` provides verifiable randomness at the protocol level
- Transactions can be reverted if the outcome is unfavorable (hence "revertible")
- For production use, consider implementing a commit-reveal pattern for additional security
- Always test on testnet before deploying to mainnet

## License

MIT

## Support

For Flow blockchain documentation, visit: https://docs.onflow.org/

