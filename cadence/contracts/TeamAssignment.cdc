// TeamAssignment.cdc
// Smart contract for randomly assigning NBA Top Shot usernames to NBA teams
// Uses Flow's commit-reveal pattern with native VRF for provably fair randomness

import "RandomConsumer"
import "Burner"

access(all) contract TeamAssignment {

    // ============ Events (Human-Readable for Flowscan) ============

    // Emitted when assignment is locked in (commit phase)
    access(all) event TeamAssignmentStarted(
        receiptID: UInt64,
        lockBlock: UInt64,
        numberOfParticipants: Int,
        participantNames: [String],
        teamOptions: [String],
        message: String
    )

    // Emitted for each individual assignment during reveal (for real-time UI)
    access(all) event ParticipantAssigned(
        receiptID: UInt64,
        participant: String,
        assignedTo: String,
        assignmentNumber: UInt64,
        totalParticipants: UInt64
    )

    // Main event - emitted when all assignments complete (shareable proof)
    access(all) event TeamAssignmentComplete(
        receiptID: UInt64,
        lockBlock: UInt64,
        revealBlock: UInt64,
        numberOfParticipants: Int,
        assignments: [String],
        summary: String,
        verificationNote: String
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
    access(all) resource Receipt : RandomConsumer.RequestWrapper {
        access(all) let usernames: [String]
        access(all) let teams: [String]
        access(all) let combos: [String]
        access(all) var request: @RandomConsumer.Request?

        init(
            usernames: [String],
            teams: [String],
            combos: [String],
            request: @RandomConsumer.Request
        ) {
            self.usernames = usernames
            self.teams = teams
            self.combos = combos
            self.request <- request
        }
    }

    // ============ Contract State ============

    // Storage for all completed assignments
    access(all) var assignments: {UInt64: Assignment}

    // Consumer resource for VRF randomness
    access(self) let consumer: @RandomConsumer.Consumer

    // Storage path for receipts
    access(all) let ReceiptStoragePath: StoragePath

    // ============ Contract Initialization ============

    init() {
        self.assignments = {}
        self.consumer <- RandomConsumer.createConsumer()
        self.ReceiptStoragePath = StoragePath(identifier: "TeamAssignmentReceipt_"
            .concat(self.account.address.toString()))!
    }

    // ============ Commit Phase ============

    // Lock in the assignment - returns a Receipt for later reveal
    // The randomness is requested but NOT revealed yet
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
        let request <- self.consumer.requestRandomness()
        let lockBlock = request.block

        // Create the receipt
        let receipt <- create Receipt(
            usernames: usernames,
            teams: teams,
            combos: combos,
            request: <-request
        )

        // Combine all team options for display
        var allOptions: [String] = []
        for team in teams {
            allOptions.append(team)
        }
        for combo in combos {
            allOptions.append(combo)
        }

        // Emit human-readable commit event
        emit TeamAssignmentStarted(
            receiptID: receipt.uuid,
            lockBlock: lockBlock,
            numberOfParticipants: usernames.length,
            participantNames: usernames,
            teamOptions: allOptions,
            message: "Assignment locked! Participants and teams are set. Randomness will be revealed after block "
                .concat(lockBlock.toString())
                .concat(". No one can predict or manipulate the outcome.")
        )

        return <- receipt
    }

    // ============ Reveal Phase ============

    // Reveal the assignments using the committed randomness
    // This consumes the receipt and returns the final assignments
    access(all) fun revealAssignment(receipt: @Receipt): {UInt64: Assignment} {
        let receiptID = receipt.uuid
        let lockBlock = receipt.getRequestBlock()!
        let revealBlock = getCurrentBlock().height
        let currentTime = getCurrentBlock().timestamp

        // Get the usernames and team options from receipt
        var remainingUsernames = receipt.usernames
        let totalParticipants = UInt64(remainingUsernames.length)

        // Combine single teams and combos
        var allAssignments: [String] = []
        for team in receipt.teams {
            allAssignments.append(team)
        }
        for combo in receipt.combos {
            allAssignments.append(combo)
        }

        var result: {UInt64: Assignment} = {}
        var assignmentStrings: [String] = []
        var index: UInt64 = 0

        // Pop the randomness request from the receipt and get the committed random seed
        let request <- receipt.popRequest()

        // Fulfill the committed randomness to get the seed value
        // This uses the randomness from the LOCK block, not the reveal block
        let seed = self.consumer.fulfillRandomRequest(request: <-request)

        // Use the committed seed to derive all random selections
        // This ensures the outcome is deterministic based on the lock block
        var seedValue = 0 as UInt64
        for byte in seed {
            seedValue = (seedValue << 8) | UInt64(byte)
        }

        // Perform the random assignments using the committed seed
        while remainingUsernames.length > 0 {
            // Derive random indices from the seed (simple linear congruential generator)
            seedValue = (seedValue &* 6364136223846793005 &+ 1442695040888963407)
            let usernameIndex = seedValue % UInt64(remainingUsernames.length)

            seedValue = (seedValue &* 6364136223846793005 &+ 1442695040888963407)
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

            // Create human-readable assignment string
            assignmentStrings.append(selectedUsername.concat(" -> ").concat(selectedAssignment))

            // Emit individual assignment event (for real-time UI updates)
            emit ParticipantAssigned(
                receiptID: receiptID,
                participant: selectedUsername,
                assignedTo: selectedAssignment,
                assignmentNumber: index + 1,
                totalParticipants: totalParticipants
            )

            // Remove assigned username and team from pools
            remainingUsernames = self.removeElement(arr: remainingUsernames, index: Int(usernameIndex))
            allAssignments = self.removeElement(arr: allAssignments, index: Int(assignmentIndex))

            index = index + 1
        }

        // Destroy the receipt (it's been used)
        Burner.burn(<-receipt)

        // Emit the main completion event (shareable proof of fairness)
        emit TeamAssignmentComplete(
            receiptID: receiptID,
            lockBlock: lockBlock,
            revealBlock: revealBlock,
            numberOfParticipants: Int(totalParticipants),
            assignments: assignmentStrings,
            summary: totalParticipants.toString()
                .concat(" participants randomly assigned to teams"),
            verificationNote: "This assignment used Flow's Verifiable Random Function (VRF). "
                .concat("The participants and teams were locked at block ")
                .concat(lockBlock.toString())
                .concat(" and revealed at block ")
                .concat(revealBlock.toString())
                .concat(". The random seed was determined by the blockchain AFTER the lock, ")
                .concat("making it impossible for anyone to predict or manipulate the results.")
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
