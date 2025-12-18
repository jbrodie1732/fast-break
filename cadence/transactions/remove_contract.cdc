// remove_contract.cdc
// Transaction to remove the old TeamAssignment contract
// This allows us to redeploy with new fields

transaction {
    prepare(signer: auth(Contracts) &Account) {
        signer.contracts.remove(name: "TeamAssignment")
    }
}

