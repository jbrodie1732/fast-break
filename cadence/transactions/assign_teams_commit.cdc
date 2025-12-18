// assign_teams_commit.cdc
// Commit phase: Request randomness and create a Receipt
// Note: Replace 0xrandomizeBreak with your deployed contract address

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
