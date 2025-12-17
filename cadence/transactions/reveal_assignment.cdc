// reveal_assignment.cdc
// Phase 2: Reveal the random assignment using committed randomness
// Must be called after commit_assignment.cdc and after a few blocks have passed

import TeamAssignment from 0x2376ce69fdac1763

transaction {

    prepare(signer: auth(Storage) &Account) {
        // Load the receipt from storage
        let receipt <- signer.storage.load<@TeamAssignment.Receipt>(
            from: /storage/TeamAssignmentReceipt
        ) ?? panic("No receipt found. Did you commit first?")

        // Reveal the assignments (this consumes the receipt)
        let assignments = TeamAssignment.revealAssignment(receipt: <-receipt)

        log("Teams revealed! Check the events for results.")
    }
}
