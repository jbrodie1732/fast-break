import * as fcl from "@onflow/fcl";

// Commit transaction - requests randomness and creates a Receipt resource
const assignTeamsCommitTransaction = `
import randomizeBreakv2 from 0xrandomizeBreakv2

transaction(usernames: [String], teams: [String], combos: [String]) {
    
    prepare(signer: auth(Storage) &Account) {
        // Commit the assignment request
        // This requests randomness and creates a Receipt resource
        // RandomConsumer.requestRandomness() automatically emits RandomnessSourced event
        let receipt <- randomizeBreakv2.commitAssignment(
            usernames: usernames,
            teams: teams,
            combos: combos
        )
        
        // Get UUID before moving the receipt
        let receiptUUID = receipt.uuid
        
        // Store the receipt in the signer's account storage
        signer.storage.save(<-receipt, to: /storage/TeamAssignmentReceipt)
        
        log("Receipt created and stored. UUID: ".concat(receiptUUID.toString()))
    }
}
`;

// Reveal transaction - uses randomness from committed block to make assignments
const assignTeamsRevealTransaction = `
import randomizeBreakv2 from 0xrandomizeBreakv2

transaction() {
    
    prepare(signer: auth(Storage) &Account) {
        // Load the receipt from account storage
        let receipt <- signer.storage.load<@randomizeBreakv2.Receipt>(
            from: /storage/TeamAssignmentReceipt
        ) ?? panic("No receipt found in account storage")
        
        // Reveal and assign using randomness from the committed block
        // RandomConsumer.fulfillRandomRequest() automatically emits RandomnessFulfilled event
        let assignments = randomizeBreakv2.revealAndAssign(receipt: <-receipt)
        
        log("Assignments completed: ".concat(assignments.length.toString()))
    }
}
`;

// Read the script file
const getAssignmentsScript = `
import randomizeBreakv2 from 0xrandomizeBreakv2

pub fun main(): {UInt64: randomizeBreakv2.Assignment} {
    return randomizeBreakv2.getAllAssignments()
}
`;

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

// Execute the assignment transaction using commit-reveal scheme
// This function handles both phases automatically for a seamless user experience
export async function assignTeams(
  usernames: string[],
  teams: string[],
  combos: string[],
  onAssignment: (assignment: AssignmentEvent) => void,
  contractAddress: string
): Promise<string> {
  try {
    // PHASE 1: COMMIT
    // Replace contract address placeholder in commit transaction
    const commitTransactionCode = assignTeamsCommitTransaction.replace(
      "0xrandomizeBreakv2",
      contractAddress
    );

    // Execute commit transaction
    const commitTransactionId = await fcl.mutate({
      cadence: commitTransactionCode,
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

    // Wait for commit transaction to be sealed
    const commitSealed = await fcl.tx(commitTransactionId).onceSealed();
    
    // The receipt is now stored in the user's account storage
    // We can proceed directly to reveal phase

    // PHASE 2: REVEAL
    // Replace contract address placeholder in reveal transaction
    const revealTransactionCode = assignTeamsRevealTransaction.replace(
      "0xrandomizeBreakv2",
      contractAddress
    );

    // Execute reveal transaction (no arguments needed - loads Receipt from storage)
    const revealTransactionId = await fcl.mutate({
      cadence: revealTransactionCode,
      args: (arg: any, t: any) => [],
      proposer: fcl.authz as any,
      payer: fcl.authz as any,
      authorizations: [fcl.authz as any], // Need authorization to access account storage
      limit: 9999,
    });

    // Subscribe to events to get real-time updates as reveal transaction processes
    const processedEvents = new Set<string>();
    
    fcl.tx(revealTransactionId).subscribe((res: any) => {
      // Process events as they come in (status 2 = executed, status 4 = sealed)
      if (res.status >= 2 && res.events) {
        res.events.forEach((event: any) => {
          // Create unique key for event to avoid duplicates
          const eventKey = `${event.type}-${event.data.assignmentIndex}`;
          
          // Handle ParticipantAssigned events
          if (event.type.includes("ParticipantAssigned") && !processedEvents.has(eventKey)) {
            processedEvents.add(eventKey);
            const assignment: AssignmentEvent = {
              username: event.data.username,
              team: event.data.team,
              assignmentIndex: parseInt(event.data.assignmentIndex),
            };
            onAssignment(assignment);
          }
        });
      }
    });

    // Wait for reveal transaction to be sealed
    const revealSealed = await fcl.tx(revealTransactionId).onceSealed();
    
    // Extract any remaining ParticipantAssigned events that might have been missed
    if (revealSealed.events) {
      revealSealed.events.forEach((event: any) => {
        const eventKey = `${event.type}-${event.data.assignmentIndex}`;
        
        // Handle ParticipantAssigned events
        if (event.type.includes("ParticipantAssigned") && !processedEvents.has(eventKey)) {
          processedEvents.add(eventKey);
          const assignment: AssignmentEvent = {
            username: event.data.username,
            team: event.data.team,
            assignmentIndex: parseInt(event.data.assignmentIndex),
          };
          onAssignment(assignment);
        }
      });
    }

    // Return the reveal transaction ID (this is the final transaction)
    return revealTransactionId;
  } catch (error) {
    console.error("Error assigning teams:", error);
    throw error;
  }
}

// Get all assignments from the contract
export async function getAllAssignments(contractAddress: string): Promise<Record<number, Assignment>> {
  try {
    // Replace contract address placeholder in script
    const scriptCode = getAssignmentsScript.replace(
      /0xrandomizeBreakv2/g,
      contractAddress
    );
    
    const result = await fcl.query({
      cadence: scriptCode,
      args: (arg: any, t: any) => [],
    });

    // Transform the result to match our Assignment interface
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

// Authenticate user
export async function authenticate(): Promise<void> {
  await fcl.authenticate();
}

// Logout user
export async function unauthenticate(): Promise<void> {
  await fcl.unauthenticate();
}

// Get current user
export function getCurrentUser() {
  return fcl.currentUser;
}
