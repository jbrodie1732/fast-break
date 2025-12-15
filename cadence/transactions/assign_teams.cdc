// assign_teams.cdc
// Transaction to assign all usernames to teams randomly
// Note: Replace 0xTeamAssignment with your deployed contract address

import TeamAssignment from 0xTeamAssignment

transaction(usernames: [String], teams: [String], combos: [String]) {
    
    execute {
        // Perform the random assignment
        // The contract is imported directly, so we can call its functions
        let assignments = TeamAssignment.assignAllRandomly(usernames: usernames, teams: teams, combos: combos)
        
        // The assignments are emitted as events and can be retrieved from the transaction result
        log("Assignments completed: ".concat(assignments.length.toString()))
    }
}

