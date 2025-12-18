// get_assignments.cdc
// Script to read all assignments from the contract
// Note: Replace 0xrandomizeBreakv2 with your deployed contract address

import randomizeBreakv2 from 0xrandomizeBreakv2

access(all) fun main(): {UInt64: randomizeBreakv2.Assignment} {
    return randomizeBreakv2.getAllAssignments()
}

