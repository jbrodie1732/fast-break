import * as fcl from "@onflow/fcl";
import * as t from "@onflow/types";

// ============ Transaction Code ============

// Phase 1: Commit transaction - locks in the assignment
const commitTransaction = `
import TeamAssignment from 0xTeamAssignment

transaction(usernames: [String], teams: [String], combos: [String]) {

    prepare(signer: auth(Storage) &Account) {
        // Commit the assignment and get a receipt
        let receipt <- TeamAssignment.commitAssignment(
            usernames: usernames,
            teams: teams,
            combos: combos
        )

        // Store the receipt in the user's account for later reveal
        signer.storage.save(<-receipt, to: /storage/TeamAssignmentReceipt)
    }
}
`;

// Phase 2: Reveal transaction - reveals the random assignments
const revealTransaction = `
import TeamAssignment from 0xTeamAssignment

transaction {

    prepare(signer: auth(Storage) &Account) {
        // Load the receipt from storage
        let receipt <- signer.storage.load<@TeamAssignment.Receipt>(
            from: /storage/TeamAssignmentReceipt
        ) ?? panic("No receipt found. Did you commit first?")

        // Reveal the assignments (this consumes the receipt)
        TeamAssignment.revealAssignment(receipt: <-receipt)
    }
}
`;

// Script to get all assignments
const getAssignmentsScript = `
import TeamAssignment from 0xTeamAssignment

access(all) fun main(): {UInt64: TeamAssignment.Assignment} {
    return TeamAssignment.getAllAssignments()
}
`;

// ============ Interfaces ============

export interface Assignment {
  username: string;
  team: string;
  assignmentIndex: number;
  timestamp: number;
}

export interface AssignmentEvent {
  username: string;
  team: string;
  assignmentIndex: number;
}

export interface CommitResult {
  transactionId: string;
  receiptID: number;
  lockBlock: number;
}

export interface RevealResult {
  transactionId: string;
  lockBlock: number;
  revealBlock: number;
  assignments: AssignmentEvent[];
}

// ============ Commit Phase ============

// Execute the commit transaction - locks in participants and teams
export async function commitTeamAssignment(
  usernames: string[],
  teams: string[],
  combos: string[],
  contractAddress: string
): Promise<CommitResult> {
  try {
    // Replace contract address placeholder
    const transactionCode = commitTransaction.replace(
      /0xTeamAssignment/g,
      contractAddress
    );

    // Build and submit the transaction
    const transactionId = await fcl.mutate({
      cadence: transactionCode,
      args: (arg: any, t: any) => [
        arg(usernames, t.Array(t.String)),
        arg(teams, t.Array(t.String)),
        arg(combos, t.Array(t.String)),
      ],
      proposer: fcl.authz as any,
      payer: fcl.authz as any,
      authorizations: [fcl.authz as any],
      limit: 9999,
    });

    // Wait for transaction to be sealed
    const sealed = await fcl.tx(transactionId).onceSealed();

    // Extract commit event data
    let receiptID = 0;
    let lockBlock = 0;

    if (sealed.events) {
      for (const event of sealed.events) {
        if (event.type.includes("TeamAssignmentStarted")) {
          receiptID = parseInt(event.data.receiptID);
          lockBlock = parseInt(event.data.lockBlock);
          break;
        }
      }
    }

    return {
      transactionId,
      receiptID,
      lockBlock,
    };
  } catch (error) {
    console.error("Error committing team assignment:", error);
    throw error;
  }
}

// ============ Reveal Phase ============

// Execute the reveal transaction - reveals random assignments
export async function revealTeamAssignment(
  contractAddress: string,
  onAssignment: (assignment: AssignmentEvent) => void
): Promise<RevealResult> {
  try {
    // Replace contract address placeholder
    const transactionCode = revealTransaction.replace(
      /0xTeamAssignment/g,
      contractAddress
    );

    // Build and submit the transaction
    const transactionId = await fcl.mutate({
      cadence: transactionCode,
      args: (arg: any, t: any) => [],
      proposer: fcl.authz as any,
      payer: fcl.authz as any,
      authorizations: [fcl.authz as any],
      limit: 9999,
    });

    // Track processed events to avoid duplicates
    const processedEvents = new Set<string>();
    const assignments: AssignmentEvent[] = [];

    // Subscribe to events for real-time updates
    fcl.tx(transactionId).subscribe((res: any) => {
      if (res.status >= 2 && res.events) {
        res.events.forEach((event: any) => {
          const eventKey = `${event.type}-${event.data.assignmentNumber}`;

          if (event.type.includes("ParticipantAssigned") && !processedEvents.has(eventKey)) {
            processedEvents.add(eventKey);
            const assignment: AssignmentEvent = {
              username: event.data.participant,
              team: event.data.assignedTo,
              assignmentIndex: parseInt(event.data.assignmentNumber) - 1,
            };
            assignments.push(assignment);
            onAssignment(assignment);
          }
        });
      }
    });

    // Wait for transaction to be sealed
    const sealed = await fcl.tx(transactionId).onceSealed();

    // Extract completion event data
    let lockBlock = 0;
    let revealBlock = 0;

    if (sealed.events) {
      // Process any remaining events
      for (const event of sealed.events) {
        if (event.type.includes("ParticipantAssigned")) {
          const eventKey = `${event.type}-${event.data.assignmentNumber}`;
          if (!processedEvents.has(eventKey)) {
            processedEvents.add(eventKey);
            const assignment: AssignmentEvent = {
              username: event.data.participant,
              team: event.data.assignedTo,
              assignmentIndex: parseInt(event.data.assignmentNumber) - 1,
            };
            assignments.push(assignment);
            onAssignment(assignment);
          }
        }

        if (event.type.includes("TeamAssignmentComplete")) {
          lockBlock = parseInt(event.data.lockBlock);
          revealBlock = parseInt(event.data.revealBlock);
        }
      }
    }

    return {
      transactionId,
      lockBlock,
      revealBlock,
      assignments,
    };
  } catch (error) {
    console.error("Error revealing team assignment:", error);
    throw error;
  }
}

// ============ Block Utilities ============

// Get the current block height
export async function getLatestBlockHeight(): Promise<number> {
  try {
    const block = await fcl.block({ sealed: true });
    return block.height;
  } catch (error) {
    console.error("Error getting block height:", error);
    throw error;
  }
}

// Check if enough blocks have passed since commit for reveal
// Flow's VRF typically needs 1-2 blocks to be ready
export async function canReveal(lockBlock: number): Promise<boolean> {
  const currentBlock = await getLatestBlockHeight();
  // Need at least 1 block after the lock block
  return currentBlock > lockBlock;
}

// Wait until reveal is possible
export async function waitForReveal(
  lockBlock: number,
  onBlockUpdate?: (currentBlock: number, targetBlock: number) => void
): Promise<void> {
  const targetBlock = lockBlock + 1;

  while (true) {
    const currentBlock = await getLatestBlockHeight();

    if (onBlockUpdate) {
      onBlockUpdate(currentBlock, targetBlock);
    }

    if (currentBlock >= targetBlock) {
      return;
    }

    // Poll every 500ms
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
}

// ============ Query Functions ============

// Get all assignments from the contract
export async function getAllAssignments(contractAddress: string): Promise<Record<number, Assignment>> {
  try {
    const scriptCode = getAssignmentsScript.replace(
      /0xTeamAssignment/g,
      contractAddress
    );

    const result = await fcl.query({
      cadence: scriptCode,
      args: (arg: any, t: any) => [],
    });

    const assignments: Record<number, Assignment> = {};
    Object.keys(result).forEach((key) => {
      const assignment = result[key];
      assignments[parseInt(key)] = {
        username: assignment.username,
        team: assignment.team,
        assignmentIndex: parseInt(assignment.assignmentIndex),
        timestamp: parseFloat(assignment.timestamp),
      };
    });

    return assignments;
  } catch (error) {
    console.error("Error getting assignments:", error);
    throw error;
  }
}

// ============ Authentication ============

export async function authenticate(): Promise<void> {
  await fcl.authenticate();
}

export async function unauthenticate(): Promise<void> {
  await fcl.unauthenticate();
}

export function getCurrentUser() {
  return fcl.currentUser;
}

// ============ Utility Functions ============

// Generate Flowscan URL for a transaction
export function getFlowscanUrl(transactionId: string, isMainnet: boolean = true): string {
  const baseUrl = isMainnet
    ? "https://flowscan.io/transaction"
    : "https://testnet.flowscan.io/transaction";
  return `${baseUrl}/${transactionId}`;
}
