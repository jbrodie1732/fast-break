// get_assignments.cdc
// Script to read all assignments from the contract

import TeamAssignment from "../contracts/TeamAssignment.cdc"

access(all) fun main(): {UInt64: TeamAssignment.Assignment} {
    return TeamAssignment.getAllAssignments()
}

