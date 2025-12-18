// TeamAssignment.cdc
// Smart contract for randomly assigning NBA Top Shot usernames to NBA teams
// Uses Flow's commit-reveal pattern with RandomConsumer VRF for provably fair randomness
// Based on Flow team's recommended approach using RandomConsumer contract

import RandomConsumer from 0x45caec600164c9e6
import Burner from 0xf233dcee88fe0abe

access(all) contract randomizeBreakv2 {
    
    // ============ Events (Matching Flow's Pattern) ============
    
    // Event emitted when a commitment is made (lock phase)
    // Note: RandomnessSourced event is automatically emitted by RandomConsumer.requestRandomness()
    access(all) event CommitmentMade(commitmentId: UInt64, lockBlock: UInt64, usernames: [String], teams: [String], combos: [String])
    
    // Event emitted when an assignment is made (matches Flow's ParticipantAssigned pattern)
    access(all) event ParticipantAssigned(username: String, team: String, assignmentIndex: UInt64, receiptID: String)
    
    // Event emitted when all assignments are complete (matches Flow's completion pattern)
    // Note: RandomnessFulfilled event is automatically emitted by RandomConsumer.fulfillRandomRequest()
    access(all) event TeamAssignmentComplete(
        commitmentId: UInt64,
        lockBlock: UInt64,
        revealBlock: UInt64,
        receiptID: String,
        verificationNote: String,
        assignments: {UInt64: Assignment}
    )
    
    // ============ Data Structures ============
    
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
    
    // Receipt resource - returned from commit, submitted to reveal
    // Conforms to RandomConsumer.RequestWrapper for VRF integration
    access(all) resource Receipt {
        access(all) let usernames: [String]
        access(all) let teams: [String]
        access(all) let combos: [String]
        access(all) let lockBlock: UInt64  // Store block height when request is created
        access(all) let commitmentId: UInt64  // Store commitment ID for tracking
        access(all) var request: @RandomConsumer.Request?
        
        init(
            usernames: [String],
            teams: [String],
            combos: [String],
            request: @RandomConsumer.Request,
            commitmentId: UInt64
        ) {
            self.usernames = usernames
            self.teams = teams
            self.combos = combos
            self.lockBlock = request.block  // Store block height before moving request
            self.commitmentId = commitmentId
            self.request <- request
        }
        
        // Required by RequestWrapper interface
        access(all) fun popRequest(): @RandomConsumer.Request? {
            let req <- self.request <- nil
            return <-req
        }
        
        // Get the block height from the request
        access(all) fun getRequestBlock(): UInt64? {
            return self.lockBlock
        }
    }
    
    // ============ Contract State ============
    
    // Storage for all completed assignments
    access(all) var assignments: {UInt64: Assignment}
    
    // Consumer resource for VRF randomness
    access(self) let consumer: @RandomConsumer.Consumer
    
    // Counter for commitment IDs (for receiptID generation)
    access(all) var nextCommitmentId: UInt64
    
    // ============ Contract Initialization ============
    
    init() {
        self.assignments = {}
        self.consumer <- RandomConsumer.createConsumer()
        self.nextCommitmentId = 0
    }
    
    // ============ Commit Phase ============
    
    // Lock in the assignment - returns a Receipt for later reveal
    // The randomness is requested but NOT revealed yet
    // RandomConsumer.requestRandomness() automatically emits RandomnessSourced event
    access(all) fun commitAssignment(
        usernames: [String],
        teams: [String],
        combos: [String]
    ): @Receipt {
        pre {
            usernames.length > 0: "Must provide at least one username"
            (teams.length + combos.length) == usernames.length: "Number of single teams plus combos must equal number of usernames"
        }
        
        // Request randomness from the VRF
        // This automatically emits RandomnessSourced event with block, randomSource, and requestUUID
        let request <- self.consumer.requestRandomness()
        let lockBlock = request.block
        
        // Generate commitment ID for tracking
        let commitmentId = self.nextCommitmentId
        self.nextCommitmentId = commitmentId + 1
        
        // Create the receipt
        let receipt <- create Receipt(
            usernames: usernames,
            teams: teams,
            combos: combos,
            request: <-request,
            commitmentId: commitmentId
        )
        
        // Emit our commitment event
        emit CommitmentMade(
            commitmentId: commitmentId,
            lockBlock: lockBlock,
            usernames: usernames,
            teams: teams,
            combos: combos
        )
        
        return <- receipt
    }
    
    // ============ Reveal Phase ============
    
    // Reveal the assignments using the committed randomness
    // This consumes the receipt and returns the final assignments
    // RandomConsumer.fulfillRandomRequest() automatically emits RandomnessFulfilled event
    access(all) fun revealAndAssign(receipt: @Receipt): {UInt64: Assignment} {
        // Get values from receipt before we move/destroy it
        let lockBlock = receipt.getRequestBlock()!
        let revealBlock = getCurrentBlock().height
        let currentTime = getCurrentBlock().timestamp
        let receiptUUID = receipt.uuid
        let commitmentId = receipt.commitmentId  // Use the commitment ID from commit phase
        
        // Generate receipt ID for events (using receipt's UUID)
        let receiptID = receiptUUID.toString()
        
        // Get the usernames and team options from receipt
        var remainingUsernames = receipt.usernames
        
        // Combine single teams and combos
        var allAssignments: [String] = []
        var i = 0
        while i < receipt.teams.length {
            allAssignments.append(receipt.teams[i])
            i = i + 1
        }
        i = 0
        while i < receipt.combos.length {
            allAssignments.append(receipt.combos[i])
            i = i + 1
        }
        
        var result: {UInt64: Assignment} = {}
        var index: UInt64 = 0
        
        // Pop the randomness request from the receipt and get the committed random seed
        let request <- receipt.popRequest()
        
        // Ensure we have a request
        if request == nil {
            panic("Receipt does not contain a valid request")
        }
        
        // Fulfill the committed randomness to get the seed value
        // This automatically emits RandomnessFulfilled event with randomResult and requestUUID
        // This uses the randomness from the LOCK block, not the reveal block
        var seedValue = self.consumer.fulfillRandomRequest(<-request!)
        
        // Perform the random assignments using the committed seed
        // Use XOR shift algorithm to derive multiple random values (PRG)
        while remainingUsernames.length > 0 {
            // XOR shift algorithm (no multiplication, no overflow)
            seedValue = seedValue ^ (seedValue << 13)
            seedValue = seedValue ^ (seedValue >> 7)
            seedValue = seedValue ^ (seedValue << 17)
            let usernameIndex = seedValue % UInt64(remainingUsernames.length)
            
            // Another round for assignment index
            seedValue = seedValue ^ (seedValue << 13)
            seedValue = seedValue ^ (seedValue >> 7)
            seedValue = seedValue ^ (seedValue << 17)
            let assignmentIndex = seedValue % UInt64(allAssignments.length)
            
            // Get selected username and team
            let selectedUsername = remainingUsernames[Int(usernameIndex)]
            let selectedAssignment = allAssignments[Int(assignmentIndex)]
            
            // Create assignment record
            let assignment = Assignment(
                username: selectedUsername,
                team: selectedAssignment,
                assignmentIndex: index,
                timestamp: currentTime
            )
            
            // Store assignment
            result[index] = assignment
            self.assignments[index] = assignment
            
            // Emit individual assignment event (for real-time UI updates)
            emit ParticipantAssigned(
                username: selectedUsername,
                team: selectedAssignment,
                assignmentIndex: index,
                receiptID: receiptID
            )
            
            // Remove assigned username and team from pools
            remainingUsernames = self.removeElement(arr: remainingUsernames, index: Int(usernameIndex))
            allAssignments = self.removeElement(arr: allAssignments, index: Int(assignmentIndex))
            
            index = index + 1
        }
        
        // Destroy the receipt (it's been used)
        Burner.burn(<-receipt)
        
        // Create verification note
        let verificationNote = "This assignment used Flow's Verifiable Random Function (VRF). The participants and teams were locked at block ".concat(lockBlock.toString()).concat(" and revealed at block ").concat(revealBlock.toString()).concat(". The random seed was determined by the blockchain AFTER the lock, making it impossible for anyone to predict or manipulate the results.")
        
        // Emit the main completion event (shareable proof of fairness)
        emit TeamAssignmentComplete(
            commitmentId: commitmentId,
            lockBlock: lockBlock,
            revealBlock: revealBlock,
            receiptID: receiptID,
            verificationNote: verificationNote,
            assignments: result
        )
        
        return result
    }
    
    // ============ Helper Functions ============
    
    // Remove element from array at index
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
    
    // ============ View Functions ============
    
    // Get all completed assignments
    access(all) fun getAllAssignments(): {UInt64: Assignment} {
        return self.assignments
    }
    
    // Get assignment by index
    access(all) fun getAssignment(index: UInt64): Assignment? {
        return self.assignments[index]
    }
}
