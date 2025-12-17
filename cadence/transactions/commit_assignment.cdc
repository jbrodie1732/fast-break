// commit_assignment.cdc
// Phase 1: Lock in the assignment - stores receipt in user's account
// The actual random assignment happens in reveal_assignment.cdc

import TeamAssignment from 0x2376ce69fdac1763

transaction(usernames: [String], teams: [String], combos: [String]) {

    prepare(signer: auth(Storage) &Account) {
        // Commit the assignment and get a receipt
        let receipt <- TeamAssignment.commitAssignment(
            usernames: usernames,
            teams: teams,
            combos: combos
        )

        // Store the receipt in the user's account for later reveal
        signer.storage.save(<-receipt, to: /storage/TeamAssignmentReceipt)

        log("Assignment committed! Receipt stored. Wait for a few blocks, then reveal.")
    }
}
