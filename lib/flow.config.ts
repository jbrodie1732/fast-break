import * as fcl from "@onflow/fcl";

// Configure Flow Client Library (FCL)
// For testnet
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "0xYOUR_CONTRACT_ADDRESS";

fcl.config({
  "accessNode.api": "https://rest-testnet.onflow.org",
  "discovery.wallet": "https://fcl-discovery.onflow.org/testnet/authn",
  "app.detail.title": "NBA Team Assignment",
  "app.detail.icon": "https://placekitten.com/g/200/200",
  "0xTeamAssignment": CONTRACT_ADDRESS,
});

export { CONTRACT_ADDRESS };
export default fcl;

