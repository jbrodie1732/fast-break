import * as fcl from "@onflow/fcl";
import * as t from "@onflow/types";

// Read the transaction file
const assignTeamsTransaction = `
import TeamAssignment from 0xTeamAssignment

transaction(usernames: [String], teams: [String]) {
    
    execute {
        // Perform the random assignment
        let assignments = TeamAssignment.assignAllRandomly(usernames: usernames, teams: teams)
        log("Assignments completed: ".concat(assignments.length.toString()))
    }
}
`;

// Read the script file
const getAssignmentsScript = `
import TeamAssignment from 0xTeamAssignment

pub fun main(): {UInt64: TeamAssignment.Assignment} {
    return TeamAssignment.getAllAssignments()
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

// Execute the assignment transaction
export async function assignTeams(
  usernames: string[],
  teams: string[],
  onAssignment: (assignment: AssignmentEvent) => void,
  contractAddress: string
): Promise<string> {
  try {
    // Replace contract address placeholder in transaction
    const transactionCode = assignTeamsTransaction.replace(
      "0xTeamAssignment",
      contractAddress
    );

    // Build the transaction
    // Note: No authorizations needed since there's no prepare block
    const transactionId = await fcl.mutate({
      cadence: transactionCode,
      args: (arg: any, t: any) => [
        arg(usernames, t.Array(t.String)),
        arg(teams, t.Array(t.String)),
      ],
      proposer: fcl.authz,
      payer: fcl.authz,
      authorizations: [], // No authorizations needed - transaction has no prepare block
      limit: 9999,
    });

    // Subscribe to events to get real-time updates as transaction processes
    const processedEvents = new Set<string>();
    
    fcl.tx(transactionId).subscribe((res: any) => {
      // Process events as they come in (status 2 = executed, status 4 = sealed)
      if (res.status >= 2 && res.events) {
        res.events.forEach((event: any) => {
          // Create unique key for event to avoid duplicates
          const eventKey = `${event.type}-${event.data.assignmentIndex}`;
          
          if (event.type.includes("AssignmentMade") && !processedEvents.has(eventKey)) {
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

    // Wait for transaction to be sealed
    const sealed = await fcl.tx(transactionId).onceSealed();
    
    // Extract any remaining AssignmentMade events that might have been missed
    if (sealed.events) {
      sealed.events.forEach((event: any) => {
        const eventKey = `${event.type}-${event.data.assignmentIndex}`;
        
        if (event.type.includes("AssignmentMade") && !processedEvents.has(eventKey)) {
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

    return transactionId;
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
      "0xTeamAssignment",
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

