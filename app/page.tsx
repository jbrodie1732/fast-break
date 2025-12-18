"use client";

import { useState, useEffect, useRef } from "react";
import {
  assignTeams,
  getAllAssignments,
  authenticate,
  getFlowscanUrl,
  AssignmentEvent
} from "@/lib/flow-interactions";
import { CONTRACT_ADDRESS } from "@/lib/flow.config";
import { getTeamLogoUrl } from "@/lib/team-logos";
import * as fcl from "@onflow/fcl";
import nbaTeams from "@/data/nba-teams.json";
import tyreseMaxeyFacts from "@/data/tyrese-maxey-facts.json";

interface Assignment {
  username: string;
  team: string;
  index: number;
  revealed?: boolean;
  isCombo?: boolean;
  teams?: string[]; // For combos: [team1, team2]
}

interface Combo {
  id: number;
  team1: string | null;
  team2: string | null;
}

type AssignmentPhase = "idle" | "committing" | "waiting" | "revealing" | "complete";

export default function Home() {
  const [user, setUser] = useState<any>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [revealedAssignments, setRevealedAssignments] = useState<Set<number>>(new Set());
  const [isHeaderRevealed, setIsHeaderRevealed] = useState(false);
  const [isFactRevealed, setIsFactRevealed] = useState(false);
  const [currentFact, setCurrentFact] = useState<string>("");
  const [isAssigning, setIsAssigning] = useState(false);
  const [transactionId, setTransactionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [usernamesInput, setUsernamesInput] = useState<string>("");
  const [parsedUsernames, setParsedUsernames] = useState<string[]>([]);
  const [userCount, setUserCount] = useState<number>(30);
  const [combos, setCombos] = useState<Combo[]>([]);
  const [draggedTeam, setDraggedTeam] = useState<string | null>(null);
  const revealTimeoutsRef = useRef<NodeJS.Timeout[]>([]);
  const scheduledRevealsRef = useRef<Set<number>>(new Set());

  // Commit-Reveal state
  const [phase, setPhase] = useState<AssignmentPhase>("idle");
  const [lockBlock, setLockBlock] = useState<number>(0);
  const [revealBlock, setRevealBlock] = useState<number>(0);
  const [currentBlock, setCurrentBlock] = useState<number>(0);
  const [statusMessage, setStatusMessage] = useState<string>("");

  // Check if user is logged in
  useEffect(() => {
    fcl.currentUser.subscribe(setUser);
  }, []);

  // Clear assignments on page load/refresh
  useEffect(() => {
    // Don't load assignments on mount - clear everything instead
    setAssignments([]);
    setRevealedAssignments(new Set());
    setTransactionId(null);
    setLockBlock(0);
    setRevealBlock(0);
    setIsHeaderRevealed(false);
  }, []);

  // Calculate combos needed when user count changes
  useEffect(() => {
    const combosNeeded = 30 - userCount;
    if (combosNeeded > 0) {
      setCombos(
        Array.from({ length: combosNeeded }, (_, i) => ({
          id: i,
          team1: null,
          team2: null,
        }))
      );
    } else {
      setCombos([]);
    }
    // Reset username input when count changes
    setUsernamesInput("");
    setParsedUsernames([]);
  }, [userCount]);

  // Parse usernames from input
  useEffect(() => {
    if (usernamesInput.trim()) {
      // Split by newlines or commas, trim whitespace, filter empty strings
      const parsed = usernamesInput
        .split(/[\n,]/)
        .map(u => u.trim())
        .filter(u => u.length > 0);
      setParsedUsernames(parsed);
    } else {
      setParsedUsernames([]);
    }
  }, [usernamesInput]);

  // Reveal fact when assignment starts
  useEffect(() => {
    if (isAssigning && !isFactRevealed) {
      // Pick a random fact
      const randomFact = tyreseMaxeyFacts[Math.floor(Math.random() * tyreseMaxeyFacts.length)];
      setCurrentFact(randomFact);
      
      // Fade in fact immediately
      setTimeout(() => {
        setIsFactRevealed(true);
      }, 300);
    } else if (!isAssigning) {
      setIsFactRevealed(false);
      setCurrentFact("");
    }
  }, [isAssigning, isFactRevealed]);

  // Reveal header when assignments first appear (after fact)
  useEffect(() => {
    if (assignments.length > 0 && !isHeaderRevealed && !isAssigning) {
      // Fade in header after fact has been shown
      const headerTimeout = setTimeout(() => {
        setIsHeaderRevealed(true);
      }, 500); // Small delay before header appears

      return () => clearTimeout(headerTimeout);
    } else if (assignments.length === 0) {
      setIsHeaderRevealed(false);
    }
  }, [assignments.length, isHeaderRevealed, isAssigning]);

  // Reveal assignments one by one with 3 second delay (only after header is revealed)
  useEffect(() => {
    // Don't start revealing tiles until header is revealed
    if (!isHeaderRevealed || assignments.length === 0) {
      return;
    }

    // Clear any existing timeouts
    revealTimeoutsRef.current.forEach(timeout => clearTimeout(timeout));
    revealTimeoutsRef.current = [];

    // Get assignments that haven't been scheduled for reveal yet, sorted by index
    const unscheduled = assignments
      .filter((a) => !scheduledRevealsRef.current.has(a.index))
      .sort((a, b) => a.index - b.index);
    
    if (unscheduled.length === 0) {
      return;
    }

    // Schedule reveals with 3 second delays, starting after header is shown
    unscheduled.forEach((assignment, idx) => {
      // Mark as scheduled
      scheduledRevealsRef.current.add(assignment.index);
      
      const timeout = setTimeout(() => {
        setRevealedAssignments((prev) => {
          // Double check it's still not revealed (avoid race conditions)
          if (!prev.has(assignment.index)) {
            return new Set([...prev, assignment.index]);
          }
          return prev;
        });
      }, (idx + 1) * 3000); // Start after 3 seconds, then every 3 seconds
      
      revealTimeoutsRef.current.push(timeout);
    });

    // Cleanup function
    return () => {
      revealTimeoutsRef.current.forEach(timeout => clearTimeout(timeout));
      revealTimeoutsRef.current = [];
    };
  }, [assignments, isHeaderRevealed]); // Depend on both assignments and header reveal

  const loadAssignments = async () => {
    try {
      const allAssignments = await getAllAssignments(CONTRACT_ADDRESS);
      const assignmentArray: Assignment[] = Object.values(allAssignments).map(
        (a) => {
          const isCombo = a.team.includes(",");
          const teams = isCombo ? a.team.split(",").map(t => t.trim()) : undefined;
          return {
            username: a.username,
            team: a.team,
            index: a.assignmentIndex,
            isCombo,
            teams,
          };
        }
      );
      assignmentArray.sort((a, b) => a.index - b.index);
      setAssignments(assignmentArray);
      // Reveal all existing assignments immediately
      setRevealedAssignments(new Set(assignmentArray.map(a => a.index)));
    } catch (err) {
      console.error("Failed to load assignments:", err);
    }
  };

  // Get teams that are NOT used in combos
  const getAvailableTeams = (): string[] => {
    const usedTeams = new Set<string>();
    combos.forEach(combo => {
      if (combo.team1) usedTeams.add(combo.team1);
      if (combo.team2) usedTeams.add(combo.team2);
    });
    return nbaTeams.filter(team => !usedTeams.has(team));
  };

  // Check if a team is used in any combo
  const isTeamUsed = (team: string): boolean => {
    return combos.some(combo => combo.team1 === team || combo.team2 === team);
  };

  // Handle drag start
  const handleDragStart = (team: string) => {
    if (!isTeamUsed(team)) {
      setDraggedTeam(team);
    }
  };

  // Handle drag over
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  // Handle drop on combo slot
  const handleDrop = (comboId: number, slot: "team1" | "team2") => {
    if (!draggedTeam || isTeamUsed(draggedTeam)) return;
    
    setCombos(prevCombos => 
      prevCombos.map(combo => {
        if (combo.id === comboId) {
          // Don't allow same team in both slots
          if (slot === "team1" && combo.team2 === draggedTeam) return combo;
          if (slot === "team2" && combo.team1 === draggedTeam) return combo;
          return { ...combo, [slot]: draggedTeam };
        }
        // Don't allow duplicate teams across combos
        if (combo.team1 === draggedTeam || combo.team2 === draggedTeam) return combo;
        return combo;
      })
    );
    setDraggedTeam(null);
  };

  // Remove team from combo
  const removeTeamFromCombo = (comboId: number, slot: "team1" | "team2") => {
    setCombos(prevCombos =>
      prevCombos.map(combo =>
        combo.id === comboId ? { ...combo, [slot]: null } : combo
      )
    );
  };

  // Check if all combos are complete
  const areCombosComplete = (): boolean => {
    return combos.every(combo => combo.team1 && combo.team2);
  };

  const handleAssign = async () => {
    if (!user || !user.loggedIn) {
      await authenticate();
      return;
    }

    // Validate usernames match user count
    if (parsedUsernames.length === 0) {
      setError("Please enter at least one username");
      return;
    }

    if (parsedUsernames.length !== userCount) {
      setError(`Please enter exactly ${userCount} usernames. You entered ${parsedUsernames.length}.`);
      return;
    }

    // Validate combos if needed
    if (combos.length > 0 && !areCombosComplete()) {
      setError("Please complete all multi-team combos before starting the assignment.");
      return;
    }

    setIsAssigning(true);
    setError(null);
    setAssignments([]);
    setRevealedAssignments(new Set());
    setIsHeaderRevealed(false);
    setIsFactRevealed(false);
    setCurrentFact("");
    setTransactionId(null);
    setLockBlock(0);
    setRevealBlock(0);
    setCurrentBlock(0);
    setPhase("idle");
    setStatusMessage("");
    // Clear any existing timeouts and reset reveal state
    revealTimeoutsRef.current.forEach(timeout => clearTimeout(timeout));
    revealTimeoutsRef.current = [];
    scheduledRevealsRef.current.clear();

    try {
      // Prepare teams and combos
      const singleTeams = getAvailableTeams();
      const comboStrings = combos.map(combo => `${combo.team1}, ${combo.team2}`);

      // Validate totals
      if (singleTeams.length + comboStrings.length !== userCount) {
        setError(`Total assignments (${singleTeams.length} single + ${comboStrings.length} combos) must equal ${userCount} users.`);
        setIsAssigning(false);
        return;
      }

      // === PHASE 1: COMMIT ===
      setPhase("committing");
      setStatusMessage("Locking in participants and teams...");

      const newAssignments: Assignment[] = [];

      // Callback to handle real-time assignment updates
      const onAssignment = (assignment: AssignmentEvent) => {
        const isCombo = assignment.team.includes(",");
        const teams = isCombo ? assignment.team.split(",").map(t => t.trim()) : [assignment.team];

        newAssignments.push({
          username: assignment.username,
          team: assignment.team,
          index: assignment.assignmentIndex,
          isCombo,
          teams: isCombo ? teams : undefined,
        });
        const sorted = [...newAssignments].sort((a, b) => a.index - b.index);
        setAssignments(sorted);
      };

      // === PHASE 2: REVEAL ===
      setPhase("revealing");
      setStatusMessage("Revealing team assignments...");

      // assignTeams handles both commit and reveal phases automatically
      const revealTransactionId = await assignTeams(
        parsedUsernames,
        singleTeams,
        comboStrings,
        onAssignment,
        CONTRACT_ADDRESS,
        (result) => {
          // Extract block numbers from completion callback
          setLockBlock(result.lockBlock);
          setRevealBlock(result.revealBlock);
        }
      );

      setTransactionId(revealTransactionId);
      setPhase("complete");
      setStatusMessage("");

    } catch (err: any) {
      setError(err.message || "Failed to assign teams");
      console.error("Assignment error:", err);
      setPhase("idle");
      setStatusMessage("");
    } finally {
      setIsAssigning(false);
    }
  };

  const handleLogin = async () => {
    await authenticate();
  };

  const handleLogout = async () => {
    await fcl.unauthenticate();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      <div className="container mx-auto px-4 py-6">
        <div className="max-w-7xl mx-auto">
          {/* Top Bar with Wallet Connection */}
          <div className="flex justify-between items-center mb-8">
            <div></div>
            {user && user.loggedIn ? (
              <div className="flex items-center gap-3 bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-lg px-4 py-2">
                <div className="text-right">
                  <p className="text-xs text-slate-400">Connected</p>
                  <p className="font-mono text-xs text-slate-300">{user.addr.slice(0, 6)}...{user.addr.slice(-4)}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="text-slate-400 hover:text-red-400 transition-colors text-xs px-2 py-1 rounded border border-slate-700 hover:border-red-500/50"
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <button
                onClick={handleLogin}
                className="bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700/50 px-4 py-2 rounded-lg text-sm transition-colors"
              >
                Connect Wallet
              </button>
            )}
          </div>

          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-6xl font-black mb-4 bg-gradient-to-r from-slate-100 via-slate-300 to-slate-100 bg-clip-text text-transparent tracking-tight">
              Fast-BREAK
            </h1>
            <p className="text-lg text-slate-400 font-light">
              On-chain random assignment powered by Flow
            </p>
          </div>

          {/* Clear Results Button - Only show after completion */}
          {transactionId && assignments.length > 0 && revealedAssignments.size === assignments.length && !isAssigning && (
            <div className="text-center mb-8">
              <button
                onClick={() => {
                  setAssignments([]);
                  setRevealedAssignments(new Set());
                  setTransactionId(null);
                  setLockBlock(0);
                  setRevealBlock(0);
                  setIsHeaderRevealed(false);
                  setUsernamesInput("");
                  setParsedUsernames([]);
                  // Clear combo selections
                  setCombos(prevCombos => 
                    prevCombos.map(combo => ({
                      ...combo,
                      team1: null,
                      team2: null
                    }))
                  );
                }}
                className="bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700/50 px-6 py-2 rounded-lg text-sm transition-colors text-slate-300 hover:text-white"
              >
                Clear Results
              </button>
            </div>
          )}

          {/* User Count Selector - Always show, but disabled when wallet not connected */}
          <div className="mb-8 max-w-xs mx-auto">
            <div className="bg-slate-900/40 backdrop-blur-lg rounded-2xl p-4 border border-slate-800/50 shadow-xl">
              <label className="block text-sm font-medium text-slate-300 mb-3 text-center">
                Number of Users:
              </label>
              <div className="flex justify-center">
                <select
                  value={userCount}
                  onChange={(e) => setUserCount(parseInt(e.target.value))}
                  className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-600 focus:border-slate-600 text-center min-w-[120px] disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isAssigning || !user || !user.loggedIn}
                >
                  {Array.from({ length: 30 }, (_, i) => i + 1).map(num => (
                    <option key={num} value={num}>{num}</option>
                  ))}
                </select>
              </div>
              {userCount < 30 && (
                <p className="mt-3 text-xs text-slate-400 text-center">
                  {30 - userCount} multi-team combo{30 - userCount !== 1 ? 's' : ''} needed
                </p>
              )}
            </div>
          </div>

          {/* Combo Builder - Only show when combos are needed */}
          {user && user.loggedIn && combos.length > 0 && (
            <div className="mb-8">
              <div className="bg-slate-900/40 backdrop-blur-lg rounded-2xl p-6 border border-slate-800/50 shadow-xl">
                <h3 className="text-3xl font-bold text-slate-200 mb-4 text-center uppercase">
                  BUILD MULTI-TEAM COMBOS
                </h3>
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Left: Available Teams */}
                  <div>
                    <h4 className="text-base font-medium text-slate-300 mb-3 uppercase">ALL NBA TEAMS</h4>
                    <div className="grid grid-cols-5 gap-2 max-h-[400px] overflow-y-auto p-4 bg-slate-800/30 rounded-xl border border-slate-700/30">
                      {nbaTeams.map((team) => {
                        const isUsed = isTeamUsed(team);
                        return (
                          <div
                            key={team}
                            draggable={!isUsed}
                            onDragStart={() => handleDragStart(team)}
                            className={`flex flex-col items-center p-2 rounded-lg border-2 transition-all ${
                              isUsed
                                ? "opacity-30 border-slate-700/30 cursor-not-allowed blur-[2px]"
                                : "border-slate-600/50 hover:border-slate-500 hover:bg-slate-700/30 cursor-grab active:cursor-grabbing"
                            }`}
                          >
                            <img
                              src={getTeamLogoUrl(team)}
                              alt={team}
                              className="w-12 h-12 object-contain"
                              draggable={false}
                            />
                            <span className="text-[10px] text-slate-400 mt-1 text-center leading-tight">
                              {team.split(" ").pop()}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Right: Combo Panels */}
                  <div>
                    <h4 className="text-base font-medium text-slate-300 mb-3 uppercase">MULTI-TEAM COMBOS</h4>
                    <div className="space-y-3 max-h-[400px] overflow-y-auto">
                      {combos.map((combo) => (
                        <div
                          key={combo.id}
                          className="bg-slate-800/30 rounded-xl p-4 border border-slate-700/30"
                        >
                          <p className="text-xs text-slate-400 mb-2">Combo {combo.id + 1}</p>
                          <div className="grid grid-cols-2 gap-2">
                            {/* Team 1 Slot */}
                            <div
                              onDragOver={handleDragOver}
                              onDrop={(e) => {
                                e.preventDefault();
                                handleDrop(combo.id, "team1");
                              }}
                              className={`min-h-[80px] rounded-lg flex flex-col items-center justify-center relative transition-all duration-300 ${
                                combo.team1
                                  ? "border-2 border-solid border-emerald-500/60 bg-emerald-500/10 shadow-lg shadow-emerald-500/20"
                                  : "border-2 border-dashed bg-slate-700/20 border-slate-600/50"
                              }`}
                            >
                              {combo.team1 ? (
                                <>
                                  <div className="absolute top-1 right-1 w-4 h-4 bg-emerald-500/80 rounded-full flex items-center justify-center">
                                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                    </svg>
                                  </div>
                                  <img
                                    src={getTeamLogoUrl(combo.team1)}
                                    alt={combo.team1}
                                    className="w-12 h-12 object-contain"
                                  />
                                  <span className="text-[10px] text-slate-300 mt-1 text-center leading-tight font-medium">
                                    {combo.team1.split(" ").pop()}
                                  </span>
                                  <button
                                    onClick={() => removeTeamFromCombo(combo.id, "team1")}
                                    className="absolute top-1 left-1 w-5 h-5 bg-red-500/80 hover:bg-red-500 rounded-full text-white text-xs flex items-center justify-center transition-all"
                                  >
                                    ×
                                  </button>
                                </>
                              ) : (
                                <span className="text-xs text-slate-500">Drop Team 1</span>
                              )}
                            </div>
                            {/* Team 2 Slot */}
                            <div
                              onDragOver={handleDragOver}
                              onDrop={(e) => {
                                e.preventDefault();
                                handleDrop(combo.id, "team2");
                              }}
                              className={`min-h-[80px] rounded-lg flex flex-col items-center justify-center relative transition-all duration-300 ${
                                combo.team2
                                  ? "border-2 border-solid border-emerald-500/60 bg-emerald-500/10 shadow-lg shadow-emerald-500/20"
                                  : "border-2 border-dashed bg-slate-700/20 border-slate-600/50"
                              }`}
                            >
                              {combo.team2 ? (
                                <>
                                  <div className="absolute top-1 right-1 w-4 h-4 bg-emerald-500/80 rounded-full flex items-center justify-center">
                                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                    </svg>
                                  </div>
                                  <img
                                    src={getTeamLogoUrl(combo.team2)}
                                    alt={combo.team2}
                                    className="w-12 h-12 object-contain"
                                  />
                                  <span className="text-[10px] text-slate-300 mt-1 text-center leading-tight font-medium">
                                    {combo.team2.split(" ").pop()}
                                  </span>
                                  <button
                                    onClick={() => removeTeamFromCombo(combo.id, "team2")}
                                    className="absolute top-1 left-1 w-5 h-5 bg-red-500/80 hover:bg-red-500 rounded-full text-white text-xs flex items-center justify-center transition-all"
                                  >
                                    ×
                                  </button>
                                </>
                              ) : (
                                <span className="text-xs text-slate-500">Drop Team 2</span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Usernames Input */}
          <div className="mb-8 max-w-3xl mx-auto">
            <div className="bg-slate-900/40 backdrop-blur-lg rounded-2xl p-6 border border-slate-800/50 shadow-xl">
              <label className="block text-sm font-medium text-slate-300 mb-3">
                Enter {userCount} Username{userCount !== 1 ? 's' : ''} (one per line or comma-separated)
              </label>
              <textarea
                value={usernamesInput}
                onChange={(e) => setUsernamesInput(e.target.value)}
                placeholder="user1
user2
user3
...
user30"
                className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-600 focus:border-slate-600 resize-none font-mono text-sm min-h-[200px] disabled:opacity-50 disabled:cursor-not-allowed"
                rows={10}
                disabled={isAssigning || !user || !user.loggedIn}
              />
              <div className="mt-3 flex items-center justify-between">
                <p className="text-xs text-slate-500">
                  {parsedUsernames.length > 0 ? (
                    <span className={parsedUsernames.length === userCount ? "text-emerald-400 font-medium" : "text-amber-400 font-medium"}>
                      {parsedUsernames.length} / {userCount} username{userCount !== 1 ? 's' : ''}
                    </span>
                  ) : (
                    "Paste usernames above (one per line or comma-separated)"
                  )}
                </p>
                {parsedUsernames.length > 0 && parsedUsernames.length !== userCount && (
                  <p className="text-xs text-amber-400">
                    Need {userCount - parsedUsernames.length} more
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Assignment Button */}
          <div className="text-center mb-12">
            <button
              onClick={handleAssign}
              disabled={isAssigning || (!user || !user.loggedIn) || parsedUsernames.length !== userCount || (combos.length > 0 && !areCombosComplete())}
              className="bg-gradient-to-r from-slate-700 to-slate-800 hover:from-slate-600 hover:to-slate-700 disabled:from-slate-800 disabled:to-slate-900 disabled:cursor-not-allowed disabled:opacity-50 px-12 py-5 rounded-xl font-semibold text-2xl transition-all transform hover:scale-105 shadow-2xl border border-slate-600/50 hover:border-slate-500"
            >
              {isAssigning ? (
                <span className="flex items-center gap-3">
                  <svg
                    className="animate-spin h-5 w-5"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  {phase === "committing" && "Locking Assignment..."}
                  {phase === "waiting" && "Waiting for Randomness..."}
                  {phase === "revealing" && "Revealing Teams..."}
                  {phase === "idle" && "Processing..."}
                </span>
              ) : (
                "START THE BREAK..."
              )}
            </button>

            {/* Phase Status Display */}
            {isAssigning && statusMessage && (
              <div className="mt-4 text-slate-400 text-sm animate-pulse">
                {statusMessage}
              </div>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-950/30 border border-red-800/50 rounded-xl p-4 mb-8 backdrop-blur-sm">
              <p className="text-red-300">{error}</p>
            </div>
          )}

          {/* Tyrese Maxey Fact - shown during loading */}
          {isAssigning && currentFact && (
            <div className="mb-8">
              <div 
                className={`bg-slate-800/40 backdrop-blur-lg rounded-2xl p-8 border border-slate-700/50 transition-all duration-500 ${
                  isFactRevealed 
                    ? "opacity-100 translate-y-0" 
                    : "opacity-0 translate-y-4"
                }`}
              >
                <p className="text-xl font-bold text-slate-300 mb-3 text-center">Did you know?</p>
                <p className="text-lg text-slate-200 text-center font-light leading-relaxed">
                  {currentFact}
                </p>
              </div>
            </div>
          )}

          {/* Verification & Share Section - Show once transaction is complete (before reveals start) */}
          {transactionId && phase === "complete" && (
            <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-6 mb-8 backdrop-blur-sm">
              {/* Verification Badge */}
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-emerald-500/20 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <p className="text-emerald-400 font-semibold text-sm">Provably Random Assignment</p>
                  <p className="text-slate-500 text-xs">Verified by Flow's VRF (Verifiable Random Function)</p>
                </div>
              </div>

              {/* Block Info */}
              {lockBlock > 0 && revealBlock > 0 && (
                <div className="bg-slate-900/50 rounded-lg p-4 mb-4 border border-slate-700/30">
                  <div className="flex justify-center items-center gap-8">
                    <div className="text-center">
                      <p className="text-slate-500 text-xs mb-1">Locked at Block</p>
                      <p className="font-mono text-slate-200 text-lg font-semibold">#{lockBlock}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-slate-500 text-xs mb-1">Revealed at Block</p>
                      <p className="font-mono text-slate-200 text-lg font-semibold">#{revealBlock}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Transaction Info */}
              <div className="mb-4">
                <p className="text-xs text-slate-500 mb-1">Reveal Transaction:</p>
                <p className="font-mono text-xs break-all text-slate-400">{transactionId}</p>
              </div>

              {/* Share Button */}
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => {
                    const url = getFlowscanUrl(transactionId);
                    navigator.clipboard.writeText(url);
                    alert("Link copied to clipboard!");
                  }}
                  className="flex items-center gap-2 bg-slate-700/50 hover:bg-slate-600/50 border border-slate-600/50 px-4 py-2 rounded-lg text-sm transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                  Share Results
                </button>
                <a
                  href={getFlowscanUrl(transactionId)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 bg-slate-700/50 hover:bg-slate-600/50 border border-slate-600/50 px-4 py-2 rounded-lg text-sm transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  View on Flowscan
                </a>
              </div>

              {/* Verification Note */}
              <p className="mt-4 text-xs text-slate-500 leading-relaxed">
                This assignment is provably fair. The participants and teams were locked at block #{lockBlock},
                and the random results were revealed at block #{revealBlock}. The randomness came from Flow's
                blockchain after the lock, making manipulation impossible. Anyone can verify this on Flowscan.
              </p>
            </div>
          )}

          {/* Assignments Display */}
          {assignments.length > 0 && (
            <div className="bg-slate-900/40 backdrop-blur-lg rounded-2xl p-8 border border-slate-800/50 shadow-2xl">
              <h2 
                className={`text-4xl font-bold mb-8 text-center text-slate-200 transition-all duration-500 ${
                  isHeaderRevealed 
                    ? "opacity-100 translate-y-0" 
                    : "opacity-0 translate-y-4"
                }`}
              >
                ...EASY TRANSITION BUCKET
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {assignments.map((assignment) => {
                  const isRevealed = revealedAssignments.has(assignment.index);
                  const isCombo = assignment.isCombo || assignment.team.includes(",");
                  const teams = isCombo 
                    ? (assignment.teams || assignment.team.split(",").map(t => t.trim()))
                    : [assignment.team];
                  
                  return (
                    <div
                      key={assignment.index}
                      className={`relative bg-slate-800/50 rounded-xl p-5 border border-slate-700/50 overflow-hidden transition-all duration-500 min-h-[180px] ${
                        isRevealed 
                          ? "opacity-100 translate-y-0" 
                          : "opacity-0 translate-y-4"
                      } hover:bg-slate-800/70 hover:border-slate-600/50 hover:shadow-lg`}
                    >
                      {/* Faded Team Logo Background - Split for combos */}
                      {isCombo && teams.length === 2 ? (
                        <div className="absolute inset-0 opacity-[0.5] pointer-events-none flex">
                          <div 
                            className="w-1/2 h-full"
                            style={{
                              backgroundImage: `url(${getTeamLogoUrl(teams[0])})`,
                              backgroundSize: "cover",
                              backgroundPosition: "center",
                              backgroundRepeat: "no-repeat",
                              filter: "blur(3px) brightness(0.7)",
                            }}
                          />
                          <div 
                            className="w-1/2 h-full"
                            style={{
                              backgroundImage: `url(${getTeamLogoUrl(teams[1])})`,
                              backgroundSize: "cover",
                              backgroundPosition: "center",
                              backgroundRepeat: "no-repeat",
                              filter: "blur(3px) brightness(0.7)",
                            }}
                          />
                        </div>
                      ) : (
                        <div 
                          className="absolute inset-0 opacity-[0.5] pointer-events-none"
                          style={{
                            backgroundImage: `url(${getTeamLogoUrl(assignment.team)})`,
                            backgroundSize: "cover",
                            backgroundPosition: "center",
                            backgroundRepeat: "no-repeat",
                            filter: "blur(3px) brightness(0.7)",
                          }}
                        />
                      )}
                      
                      <div className="relative z-10 h-full flex flex-col">
                        <div className="flex items-start justify-between mb-auto">
                          <span className="text-xs text-slate-500 font-mono">
                            #{assignment.index + 1}
                          </span>
                          {isCombo && (
                            <span className="text-sm text-purple-400 font-bold uppercase tracking-wider px-2 py-1 bg-purple-500/20 rounded-md border border-purple-500/30 -mr-1 -mt-1">
                              COMBO
                            </span>
                          )}
                          {isAssigning && isRevealed && !isCombo && (
                            <span className="text-xs text-emerald-400 animate-pulse flex items-center gap-1">
                              <span className="w-2 h-2 bg-emerald-400 rounded-full"></span>
                              Live
                            </span>
                          )}
                        </div>
                        <div className="mt-auto">
                          <div className="font-bold text-lg mb-2 text-slate-100">
                            {assignment.username}
                          </div>
                          <div className="text-slate-200 text-base font-semibold">
                            {isCombo ? teams.join(" + ") : assignment.team}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Empty State */}
          {assignments.length === 0 && !isAssigning && (
            <div className="bg-slate-900/40 backdrop-blur-lg rounded-2xl p-16 text-center border border-slate-800/50">
              <p className="text-slate-500 text-lg">
                Ready to assign teams. Click the button above to begin.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
