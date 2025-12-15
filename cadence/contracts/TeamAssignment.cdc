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
    // Combos are passed as arrays of two-team strings like ["Team1, Team2", "Team3, Team4"]
    access(all) fun assignAllRandomly(usernames: [String], teams: [String], combos: [String]): {UInt64: Assignment} {
        pre {
            usernames.length > 0: "Must provide at least one username"
            (teams.length + combos.length) == usernames.length: "Number of single teams plus combos must equal number of usernames"
        }
        
        var remainingUsernames = usernames
        var remainingSingleTeams = teams
        var remainingCombos = combos
        var result: {UInt64: Assignment} = {}
        var index: UInt64 = 0
        let currentTime = getCurrentBlock().timestamp
        
        // Combine single teams and combos into one pool for random assignment
        var allAssignments: [String] = []
        var i = 0
        while i < remainingSingleTeams.length {
            allAssignments.append(remainingSingleTeams[i])
            i = i + 1
        }
        i = 0
        while i < remainingCombos.length {
            allAssignments.append(remainingCombos[i])
            i = i + 1
        }
        
        // Loop through and assign each username to a random team or combo
        while remainingUsernames.length > 0 {
            // Get random index for username selection
            let usernameRandomValue = revertibleRandom<UInt64>()
            let usernameIndex = usernameRandomValue % UInt64(remainingUsernames.length)
            
            // Get random index for assignment selection (team or combo)
            let assignmentRandomValue = revertibleRandom<UInt64>()
            let assignmentIndex = assignmentRandomValue % UInt64(allAssignments.length)
            
            // Get the selected username and assignment (team or combo)
            let selectedUsername = remainingUsernames[Int(usernameIndex)]
            let selectedAssignment = allAssignments[Int(assignmentIndex)]
            
            // Create assignment
            let assignment = Assignment(
                username: selectedUsername,
                team: selectedAssignment,
                assignmentIndex: index,
                timestamp: currentTime
            )
            
            // Store assignment
            result[index] = assignment
            self.assignments[index] = assignment
            
            // Emit event for this assignment
            emit AssignmentMade(
                username: selectedUsername,
                team: selectedAssignment,
                assignmentIndex: index
            )
            
            // Remove assigned username and assignment from remaining pools
            remainingUsernames = self.removeElement(arr: remainingUsernames, index: Int(usernameIndex))
            allAssignments = self.removeElement(arr: allAssignments, index: Int(assignmentIndex))
            
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

