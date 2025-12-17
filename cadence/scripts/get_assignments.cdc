// get_assignments.cdc
// Script to read all completed assignments from the contract

import TeamAssignment from 0xTeamAssignment

access(all) fun main(): {UInt64: TeamAssignment.Assignment} {
    return TeamAssignment.getAllAssignments()
}

