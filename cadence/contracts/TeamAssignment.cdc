// TeamAssignment.cdc
// Smart contract for randomly assigning NBA Top Shot usernames to NBA teams
// Uses Flow's on-chain randomness (revertibleRandom)

access(all) contract TeamAssignment {
    
    // Event emitted when an assignment is made
    access(all) event AssignmentMade(username: String, team: String, assignmentIndex: UInt64)
    
    // Event emitted when all assignments are complete
    access(all) event AllAssignmentsComplete(assignments: {UInt64: Assignment})
    
    // Assignment structure
    access(all) struct Assignment {
        access(all) let username: String
        access(all) let team: String
        access(all) let assignmentIndex: UInt64
        access(all) let timestamp: UFix64
        
        init(username: String, team: String, assignmentIndex: UInt64, timestamp: UFix64) {
            self.username = username
            self.team = team
            self.assignmentIndex = assignmentIndex
            self.timestamp = timestamp
        }
    }
    
    // Storage for all assignments
    access(all) var assignments: {UInt64: Assignment}
    
    init() {
        self.assignments = {}
    }
    
    // Main function: Randomly assign all usernames to teams in one transaction
    // This function uses Flow's revertibleRandom() for on-chain randomness
    access(all) fun assignAllRandomly(usernames: [String], teams: [String]): {UInt64: Assignment} {
        pre {
            usernames.length == teams.length: "Number of usernames must equal number of teams"
            usernames.length > 0: "Must provide at least one username and team"
        }
        
        var remainingUsernames = usernames
        var remainingTeams = teams
        var result: {UInt64: Assignment} = {}
        var index: UInt64 = 0
        let currentTime = getCurrentBlock().timestamp
        
        // Loop through and assign each username to a random team
        while remainingUsernames.length > 0 {
            // Get random index for username selection
            let usernameRandomValue = revertibleRandom<UInt64>()
            let usernameIndex = usernameRandomValue % UInt64(remainingUsernames.length)
            
            // Get random index for team selection
            let teamRandomValue = revertibleRandom<UInt64>()
            let teamIndex = teamRandomValue % UInt64(remainingTeams.length)
            
            // Get the selected username and team
            let selectedUsername = remainingUsernames[Int(usernameIndex)]
            let selectedTeam = remainingTeams[Int(teamIndex)]
            
            // Create assignment
            let assignment = Assignment(
                username: selectedUsername,
                team: selectedTeam,
                assignmentIndex: index,
                timestamp: currentTime
            )
            
            // Store assignment
            result[index] = assignment
            self.assignments[index] = assignment
            
            // Emit event for this assignment
            emit AssignmentMade(
                username: selectedUsername,
                team: selectedTeam,
                assignmentIndex: index
            )
            
            // Remove assigned username and team from remaining pools
            remainingUsernames = self.removeElement(arr: remainingUsernames, index: Int(usernameIndex))
            remainingTeams = self.removeElement(arr: remainingTeams, index: Int(teamIndex))
            
            index = index + 1
        }
        
        // Emit completion event
        emit AllAssignmentsComplete(assignments: result)
        
        return result
    }
    
    // Helper function to remove element from array
    access(all) fun removeElement(arr: [String], index: Int): [String] {
        var result: [String] = []
        var i = 0
        while i < arr.length {
            if i != index {
                result.append(arr[i])
            }
            i = i + 1
        }
        return result
    }
    
    // Get all assignments
    access(all) fun getAllAssignments(): {UInt64: Assignment} {
        return self.assignments
    }
    
    // Get assignment by index
    access(all) fun getAssignment(index: UInt64): Assignment? {
        return self.assignments[index]
    }
}

