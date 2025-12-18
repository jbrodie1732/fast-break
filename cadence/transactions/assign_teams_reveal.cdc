// assign_teams_reveal.cdc
// Reveal phase: Use randomness from committed block to make assignments
// Note: Replace 0xrandomizeBreak with your deployed contract address

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
