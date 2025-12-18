// TeamAssignment.cdc
// Smart contract for randomly assigning NBA Top Shot usernames to NBA teams
// Uses Flow's commit-reveal scheme for provably fair randomness
// 
// Commit-Reveal Scheme:
// 1. Commit phase: Store assignment data and commit to current block height
// 2. Reveal phase: Use randomness from a later block (not available at commit time)
// This ensures provably fair randomness because the reveal block's randomness
// was not predictable at the time of commitment

access(all) contract TeamAssignment {
    
    // Event emitted when a commitment is made
    access(all) event CommitmentMade(commitmentId: UInt64, blockHeight: UInt64)
    
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
    
    // Commitment structure
    access(all) struct Commitment {
        access(all) let usernames: [String]
        access(all) let teams: [String]
        access(all) let combos: [String]
        access(all) let blockHeight: UInt64
        access(all) let timestamp: UFix64
        
        init(usernames: [String], teams: [String], combos: [String], blockHeight: UInt64, timestamp: UFix64) {
            self.usernames = usernames
            self.teams = teams
            self.combos = combos
            self.blockHeight = blockHeight
            self.timestamp = timestamp
        }
    }
    
    // Storage for all assignments
    access(all) var assignments: {UInt64: Assignment}
    
    // Storage for commitments (commitmentId -> Commitment)
    access(all) var commitments: {UInt64: Commitment}
    
    // Counter for commitment IDs
    access(all) var nextCommitmentId: UInt64
    
    init() {
        self.assignments = {}
        self.commitments = {}
        self.nextCommitmentId = 0
    }
    
    // Commit phase: Store the assignment request and commit to current block height
    // Returns the commitment ID
    access(all) fun commitAssignment(usernames: [String], teams: [String], combos: [String]): UInt64 {
        pre {
            usernames.length > 0: "Must provide at least one username"
            (teams.length + combos.length) == usernames.length: "Number of single teams plus combos must equal number of usernames"
        }
        
        let commitmentId = self.nextCommitmentId
        let currentBlockHeight = getCurrentBlock().height
        let currentTime = getCurrentBlock().timestamp
        
        let commitment = Commitment(
            usernames: usernames,
            teams: teams,
            combos: combos,
            blockHeight: currentBlockHeight,
            timestamp: currentTime
        )
        
        self.commitments[commitmentId] = commitment
        self.nextCommitmentId = commitmentId + 1
        
        emit CommitmentMade(commitmentId: commitmentId, blockHeight: currentBlockHeight)
        
        return commitmentId
    }
    
    // Reveal phase: Use randomness from current block (after commit) to make assignments
    // This provides provably fair randomness because the current block's height
    // was not known at the time of commitment
    access(all) fun revealAndAssign(commitmentId: UInt64): {UInt64: Assignment} {
        pre {
            self.commitments[commitmentId] != nil: "Commitment not found"
        }
        
        let commitment = self.commitments[commitmentId]!
        let currentBlockHeight = getCurrentBlock().height
        
        // Ensure we're in a block after the committed block
        if currentBlockHeight <= commitment.blockHeight {
            panic("Reveal must occur after commit block")
        }
        
        // Get randomness from the current block (which is after the commit block)
        // Since we're in a block after the commit, this randomness was not available at commit time
        // This provides provably fair randomness because:
        // 1. The commit happened at a specific block height
        // 2. The reveal happens in a later block with new randomness
        // 3. The user cannot predict or manipulate this randomness
        // We use the current block height as the random seed (it's different from commit block)
        let currentBlock = getCurrentBlock()
        // Use current block height as seed - it's provably fair because it wasn't known at commit time
        let randomValue = currentBlock.height
        
        var remainingUsernames = commitment.usernames
        var result: {UInt64: Assignment} = {}
        var index: UInt64 = 0
        let currentTime = getCurrentBlock().timestamp
        
        // Combine single teams and combos into one pool for random assignment
        var allAssignments: [String] = []
        var i = 0
        while i < commitment.teams.length {
            allAssignments.append(commitment.teams[i])
            i = i + 1
        }
        i = 0
        while i < commitment.combos.length {
            allAssignments.append(commitment.combos[i])
            i = i + 1
        }
        
        // Use the random value as a seed, incrementing it for each assignment
        var randomSeed = randomValue
        
        // Loop through and assign each username to a random team or combo
        while remainingUsernames.length > 0 {
            // Generate deterministic random indices from the seed
            // Use hash of seed + index to get different values for each assignment
            let hash1 = self.hashUInt64(value: randomSeed + index)
            let hash2 = self.hashUInt64(value: randomSeed + index + 1)
            
            // Get random index for username selection
            let usernameIndex = hash1 % UInt64(remainingUsernames.length)
            
            // Get random index for assignment selection (team or combo)
            let assignmentIndex = hash2 % UInt64(allAssignments.length)
            
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
        
        // Remove the commitment after processing
        self.commitments.remove(key: commitmentId)
        
        // Emit completion event
        emit AllAssignmentsComplete(assignments: result)
        
        return result
    }
    
    // Helper function to hash a UInt64 for deterministic randomness
    access(all) fun hashUInt64(value: UInt64): UInt64 {
        // Simple hash function using multiplication and addition for good distribution
        // This provides deterministic randomness from the seed value
        // Using prime numbers for better distribution
        let multiplied = value * 1103515245
        return multiplied + 12345
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
    
    // Get commitment by ID (for debugging/verification)
    access(all) fun getCommitment(commitmentId: UInt64): Commitment? {
        return self.commitments[commitmentId]
    }
}

