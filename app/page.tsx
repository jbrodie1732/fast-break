"use client";

import { useState, useEffect, useRef } from "react";
import { assignTeams, getAllAssignments, authenticate, getCurrentUser, AssignmentEvent } from "@/lib/flow-interactions";
import { CONTRACT_ADDRESS } from "@/lib/flow.config";
import { getTeamLogoUrl } from "@/lib/team-logos";
import * as fcl from "@onflow/fcl";
import nbaTeams from "@/data/nba-teams.json";
import usernames from "@/data/usernames.json";
import tyreseMaxeyFacts from "@/data/tyrese-maxey-facts.json";

interface Assignment {
  username: string;
  team: string;
  index: number;
  revealed?: boolean;
}

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
  const revealTimeoutsRef = useRef<NodeJS.Timeout[]>([]);
  const scheduledRevealsRef = useRef<Set<number>>(new Set());

  // Check if user is logged in
  useEffect(() => {
    fcl.currentUser.subscribe(setUser);
  }, []);

  // Load existing assignments on mount
  useEffect(() => {
    loadAssignments();
  }, []);

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
        (a) => ({
          username: a.username,
          team: a.team,
          index: a.assignmentIndex,
        })
      );
      assignmentArray.sort((a, b) => a.index - b.index);
      setAssignments(assignmentArray);
      // Reveal all existing assignments immediately
      setRevealedAssignments(new Set(assignmentArray.map(a => a.index)));
    } catch (err) {
      console.error("Failed to load assignments:", err);
    }
  };

  const handleAssign = async () => {
    if (!user || !user.loggedIn) {
      await authenticate();
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
    // Clear any existing timeouts and reset reveal state
    revealTimeoutsRef.current.forEach(timeout => clearTimeout(timeout));
    revealTimeoutsRef.current = [];
    scheduledRevealsRef.current.clear();

    try {
      // Create a copy of arrays for manipulation
      const remainingUsernames = [...usernames];
      const remainingTeams = [...nbaTeams];
      const newAssignments: Assignment[] = [];

      // Callback to handle real-time assignment updates
      const onAssignment = (assignment: AssignmentEvent) => {
        newAssignments.push({
          username: assignment.username,
          team: assignment.team,
          index: assignment.assignmentIndex,
        });
        // Sort by index and update state
        const sorted = [...newAssignments].sort((a, b) => a.index - b.index);
        setAssignments(sorted);
      };

      // Execute the transaction
      const txId = await assignTeams(
        remainingUsernames,
        remainingTeams,
        onAssignment,
        CONTRACT_ADDRESS
      );

      setTransactionId(txId);
    } catch (err: any) {
      setError(err.message || "Failed to assign teams");
      console.error("Assignment error:", err);
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
          <div className="text-center mb-12">
            <h1 className="text-6xl font-black mb-4 bg-gradient-to-r from-slate-100 via-slate-300 to-slate-100 bg-clip-text text-transparent tracking-tight">
              Fast-BREAK
            </h1>
            <p className="text-lg text-slate-400 font-light">
              On-chain random assignment powered by Flow
            </p>
          </div>

          {/* Assignment Button */}
          <div className="text-center mb-12">
            <button
              onClick={handleAssign}
              disabled={isAssigning || (!user || !user.loggedIn)}
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
                  Processing...
                </span>
              ) : (
                "START THE BREAK..."
              )}
            </button>
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

          {/* Transaction ID */}
          {transactionId && (
            <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-4 mb-8 backdrop-blur-sm">
              <p className="text-xs text-slate-400 mb-1">Transaction ID:</p>
              <p className="font-mono text-xs break-all text-slate-300">{transactionId}</p>
              <a
                href={`https://testnet.flowscan.io/tx/${transactionId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-slate-400 hover:text-slate-300 text-xs mt-2 inline-block transition-colors"
              >
                View on Flowscan →
              </a>
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
                  const logoUrl = getTeamLogoUrl(assignment.team);
                  
                  return (
                    <div
                      key={assignment.index}
                      className={`relative bg-slate-800/50 rounded-xl p-5 border border-slate-700/50 overflow-hidden transition-all duration-500 ${
                        isRevealed 
                          ? "opacity-100 translate-y-0" 
                          : "opacity-0 translate-y-4"
                      } hover:bg-slate-800/70 hover:border-slate-600/50 hover:shadow-lg`}
                    >
                      {/* Faded Team Logo Background */}
                      <div 
                        className="absolute inset-0 opacity-[0.25] pointer-events-none"
                        style={{
                          backgroundImage: `url(${logoUrl})`,
                          backgroundSize: "cover",
                          backgroundPosition: "center",
                          backgroundRepeat: "no-repeat",
                          filter: "blur(6px) brightness(0.6)",
                        }}
                      />
                      
                      <div className="relative z-10">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-xs text-slate-500 font-mono">
                            #{assignment.index + 1}
                          </span>
                          {isAssigning && isRevealed && (
                            <span className="text-xs text-emerald-400 animate-pulse flex items-center gap-1">
                              <span className="w-2 h-2 bg-emerald-400 rounded-full"></span>
                              Live
                            </span>
                          )}
                        </div>
                        <div className="font-bold text-lg mb-2 text-slate-100">
                          {assignment.username}
                        </div>
                        <div className="text-slate-400 text-sm font-medium">
                          {assignment.team}
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
