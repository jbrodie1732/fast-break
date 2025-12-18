import * as fcl from "@onflow/fcl";

// Configure Flow Client Library (FCL)
// For testnet
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "0xYOUR_CONTRACT_ADDRESS";

fcl.config({
  "accessNode.api": "https://rest-mainnet.onflow.org",
  "discovery.wallet": "https://fcl-discovery.onflow.org/mainnet/authn",
  "app.detail.title": "Fast-BREAK",
  "app.detail.icon": "https://cdn.nba.com/headshots/nba/latest/1040x760/1630178.png",
  "0xrandomizeBreak": CONTRACT_ADDRESS,
  "0xrandomizeBreakv2": CONTRACT_ADDRESS,
});

export { CONTRACT_ADDRESS };
export default fcl;

