// src/pages/GameBoard.tsx
//
// Dead Man's Hand — vs CPU battle UI.
//
// State flows entirely through the local engine (see ../lib/dmh/engine.ts).
// On match end, calls `report_cpu_match_result` RPC to award XP.
//
// CRITICAL UX NOTES:
//   - We never reveal CPU hole cards until showdown (UI redacts them).
//   - CPU "thinks" with a 600ms staged delay so actions don't blur together.
//   - Phase transitions trigger animation via motion/react.
//   - Community cards are dealt one at a time, animated in.

import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import toast from "react-hot-toast";
import { useNavigate, useLocation } from "react-router-dom";
import { Crown, Coins, Flame, Skull, Sword, Shield, Eye, EyeOff } from "lucide-react";
import { supabase } from "../lib/supabase";

import { newMatch, step, listLegalActions } from "../lib/dmh/engine";
import { chooseAction, type CpuDifficulty } from "../lib/dmh/cpu";
import type { Action, MatchState, PokerCard, Seat } from "../lib/dmh/types";

const SUIT_COLOR: Record<PokerCard["suit"], string> = {
  "S": "text-gray-200",
  "C": "text-gray-200",
  "H": "text-rose-400",
  "D": "text-rose-400",
};

const RANK_LABEL: Record<number, string> = {
  11: "J", 12: "Q", 13: "K", 14: "A",
};

function rankLabel(n: number): string {
  return RANK_LABEL[n] ?? String(n);
}

// ─────────────────────────────────────────────────────────────────────────
export default function GameBoard() {
  const nav = useNavigate();
  const location = useLocation();
  // Expects { p1Deck, p2Deck, difficulty, seed } passed in via router state.
  const initState = location.state as null | {
    p1Deck: { leader: any; cards: any[] };
    p2Deck: { leader: any; cards: any[] };
    difficulty: CpuDifficulty;
    seed: number;
    user_id: string;
  };

  const [state, setState] = useState<MatchState | null>(null);
  const [reveal, setReveal] = useState(false); // shows CPU hole cards on showdown
  const cpuTurnInProgress = useRef(false);

  // Initialize match
  useEffect(() => {
    if (!initState) {
      toast.error("No match to start. Returning to menu.");
      nav("/play");
      return;
    }
    // Note: The newMatch function in engine.ts uses a specific structure. 
    // Adapting to what engine.ts expects if necessary, but using the user provided structure for now.
    // engine.ts: newMatch(input: NewMatchInput)
    const m = newMatch({
      p1: { user_id: initState.user_id, user_name: "Player", deck: { leaderCardId: initState.p1Deck.leader.id, cards: initState.p1Deck.cards.map((c: any) => c.id) } },
      p2: { user_id: "cpu", user_name: "CPU", deck: { leaderCardId: initState.p2Deck.leader.id, cards: initState.p2Deck.cards.map((c: any) => c.id) } },
      seed: initState.seed,
    });
    setState(m);
  }, [initState, nav]);

  // CPU action loop — runs whenever it's CPU's turn
  useEffect(() => {
    if (!state || !initState) return;
    if (state.phase === "ended") return;
    // Assuming 'B' is CPU (p2 in previous engine logic, but 'B' in current types.ts)
    if (state.activePlayer !== "B") return;
    if (cpuTurnInProgress.current) return;

    cpuTurnInProgress.current = true;
    const t = setTimeout(() => {
      const a = chooseAction(state, "B", initState.difficulty);
      if (a) {
        setState((cur) => (cur ? step(cur, a) : cur));
      }
      cpuTurnInProgress.current = false;
    }, 600);
    return () => clearTimeout(t);
  }, [state, initState]);

  // Match-end side effect: report result for XP
  useEffect(() => {
    if (!state || state.phase !== "ended" || !initState) return;
    // winner in types is PlayerSide ('A' | 'B')
    const winner = state.winner;
    void supabase.rpc("report_cpu_match_result", {
      p_difficulty: initState.difficulty,
      p_won: winner === "A",
      p_hand_count: state.handNumber,
    });
    setReveal(true);
  }, [state, initState]);

  if (!state) return <div className="p-8 text-gray-400" id="loading-game">Loading match…</div>;

  const me = state.players.A, cpu = state.players.B;
  const myActions = useMemo(() => listLegalActions(state, "A"), [state]);

  function act(a: any) {
    if (state!.phase === "ended") return;
    setState((cur) => (cur ? step(cur, a) : cur));
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-950 via-emerald-900 to-emerald-950 text-white" id="game-board">
      <header className="bg-black/60 px-4 py-2 flex justify-between items-center" id="game-header">
        <div className="flex items-center gap-3">
          <button onClick={() => nav("/play")} className="text-gray-400 hover:text-white" id="btn-quit-game">← Quit</button>
          <h1 className="text-lg font-bold text-amber-400">Hand {state.handNumber} · {state.phase}</h1>
        </div>
        <div className="text-sm text-gray-400">
          Big Blind {state.bigBlind}
          {state.location && (
            <span className="ml-3 text-amber-300">📍 {state.location.cardId}</span>
          )}
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4 grid grid-cols-12 gap-3" id="game-table">
        {/* OPPONENT */}
        <PlayerPanel side="top" player={cpu} reveal={reveal} isOpponent />

        {/* TABLE CENTER */}
        <div className="col-span-12 bg-emerald-800/40 border-2 border-amber-700/40 rounded-2xl p-4 my-2" id="community-area">
          <div className="flex justify-center items-center gap-2 mb-3">
            {state.community.map((c, i) => (
              <PokerCardDisplay key={i} card={c} />
            ))}
            {Array.from({ length: 5 - state.community.length }).map((_, i) => (
              <div key={`b${i}`} className="w-12 h-16 rounded bg-gray-900/50 border border-gray-700" />
            ))}
          </div>
          <div className="flex justify-center items-center gap-4 text-amber-300" id="pot-display">
            <Coins className="w-5 h-5" />
            <span className="text-2xl font-bold">{state.pot.main + state.pot.phantom}</span>
            <span className="text-sm text-gray-400">in pot</span>
          </div>
        </div>

        {/* PLAYER */}
        <PlayerPanel side="bottom" player={me} reveal={true} />

        {/* ACTIONS */}
        <div className="col-span-12 bg-black/40 rounded-xl p-3 mt-2" id="action-area">
          {state.phase === "ended" ? (
            <EndScreen
              winner={state.winner!}
              onAgain={() => nav("/play")}
            />
          ) : state.activePlayer === "A" ? (
            <ActionBar actions={myActions} onAct={act} />
          ) : (
            <div className="text-center text-gray-400 italic py-2">Opponent thinking…</div>
          )}
        </div>

        {/* LOG */}
        <details className="col-span-12 bg-black/30 rounded p-2 text-xs text-gray-300" id="game-log">
          <summary className="cursor-pointer text-gray-400">Game Log ({state.log.length})</summary>
          <ol className="mt-2 max-h-40 overflow-y-auto space-y-0.5 list-decimal list-inside">
            {state.log.slice(-30).reverse().map((e, i) => (
              <li key={i}><span className="text-amber-500">[{e.phase}]</span> {e.text}</li>
            ))}
          </ol>
        </details>
      </main>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
const PlayerPanel: React.FC<{
  player: any;
  side: "top" | "bottom";
  reveal: boolean;
  isOpponent?: boolean;
}> = ({
  player,
  side,
  reveal,
  isOpponent = false,
}) => {
  return (
    <div className={`col-span-12 ${side === "top" ? "mb-4" : "mt-4"}`} id={`player-panel-${player.side}`}>
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center gap-2">
          < Crown className="w-4 h-4 text-amber-400" />
          <span className="font-semibold">{player.name}</span>
          <span className="text-amber-300">— {player.leaderCardId}</span>
          {player.leaderIgnited && <span className="ml-1 text-rose-400 flex items-center gap-1"><Flame className="w-3 h-3" />Ignited</span>}
          <span className="text-xs text-gray-400 ml-2">Fuel {player.leaderFuel}</span>
        </div>
        <div className="flex items-center gap-2">
          <Coins className="w-4 h-4 text-amber-400" />
          <span className="text-lg font-bold">{player.stash}</span>
          {player.stash === 0 && <span className="text-xs px-1 bg-rose-900 text-rose-300 rounded">ALL-IN</span>}
        </div>
      </div>

      {/* 3-seat casino floor */}
      <div className="grid grid-cols-3 gap-2 mb-2" id={`seats-${player.side}`}>
        {player.seats.map((s: Seat, i: number) => (
          <SeatTile
            key={i}
            unit={s.unit}
            locked={s.locked}
            exhausted={false} // Exhaustion logic not fully implemented in engine.ts yet
          />
        ))}
      </div>

      {/* Hole cards */}
      <div className="flex gap-2 items-center" id={`hole-cards-${player.side}`}>
        <span className="text-xs text-gray-400">Hole:</span>
        {player.holeCards.map((c: PokerCard, i: number) => (
          reveal || !isOpponent
            ? <PokerCardDisplay key={i} card={c} />
            : <div key={i} className="w-10 h-14 bg-gradient-to-br from-rose-900 to-rose-700 border border-rose-500 rounded flex items-center justify-center" id={`hidden-card-${i}`}><EyeOff className="w-4 h-4 text-rose-300" /></div>
        ))}
        {!isOpponent && <span className="ml-2 text-xs text-gray-400">Hand: {player.hand.length} · Deck: {player.deck.length}</span>}
      </div>
    </div>
  );
}

const SeatTile: React.FC<{ unit: any; locked: boolean; exhausted: boolean }> = ({
  unit,
  locked,
  exhausted,
}) => {
  if (locked) {
    return (
      <div className="bg-red-950 border border-red-700 rounded p-2 text-center text-xs text-red-300 h-20 flex items-center justify-center" id="locked-seat">
        🔒 Locked
      </div>
    );
  }
  if (!unit) {
    return <div className="bg-emerald-950/40 border border-dashed border-emerald-700 rounded h-20" id="empty-seat" />;
  }
  return (
    <div className={`relative bg-gray-900 border rounded p-2 h-20 ${exhausted ? "border-red-700 opacity-60" : "border-amber-700"}`} id={`unit-seat-${unit.cardId}`}>
      <div className="text-sm font-semibold text-amber-300 truncate">{unit.name}</div>
      <div className="text-xs text-gray-400 flex items-center gap-2">
        <span className="flex items-center gap-1"><Shield className="w-3 h-3" />{unit.baseDefense}</span>
        {unit.keyword && <span className="text-amber-400">{unit.keyword}</span>}
      </div>
      {exhausted && (
        <span className="absolute top-0 right-0 text-xs bg-red-900 text-red-200 px-1 rounded-bl">Exh</span>
      )}
    </div>
  );
}

const PokerCardDisplay: React.FC<{ card: PokerCard }> = ({ card }) => {
  return (
    <div className="w-10 h-14 bg-gray-50 rounded shadow-md flex flex-col items-center justify-center" id={`poker-card-${card.rank}-${card.suit}`}>
      <div className={`text-lg font-bold ${SUIT_COLOR[card.suit]}`}>{rankLabel(card.rank)}</div>
      <div className={`text-lg ${SUIT_COLOR[card.suit]}`}>{card.suit}</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
function ActionBar({
  actions,
  onAct,
}: {
  actions: Action[];
  onAct: (a: Action) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2 justify-center" id="action-buttons">
      {actions.map((a, i) => (
        <ActionBtn 
          key={i} 
          label={a.type} 
          onClick={() => onAct(a)} 
          variant={a.type === 'raise' || a.type === 'bet' ? 'primary' : a.type === 'fold' ? 'danger' : 'default'} 
          id={`btn-action-${a.type}`}
        />
      ))}
    </div>
  );
}

const ActionBtn: React.FC<{
  label: string;
  onClick: () => void;
  variant?: "default" | "primary" | "danger" | "amber" | "rose";
  icon?: React.ReactNode;
  id?: string;
}> = ({
  label,
  onClick,
  variant = "default",
  icon,
  id,
}) => {
  const cls = {
    default: "bg-gray-800 hover:bg-gray-700 text-white",
    primary: "bg-emerald-600 hover:bg-emerald-500 text-white",
    danger: "bg-red-700 hover:bg-red-600 text-white",
    amber: "bg-amber-600 hover:bg-amber-500 text-black",
    rose: "bg-rose-700 hover:bg-rose-600 text-white",
  }[variant];

  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded font-semibold flex items-center gap-2 ${cls}`}
      id={id}
    >
      {icon as React.ReactNode}
      {label.toUpperCase()}
    </button>
  );
}

function EndScreen({ winner, onAgain }: { winner: string; onAgain: () => void }) {
  const youWin = winner === "A";
  return (
    <div className="text-center py-8" id="end-screen">
      <h2 className={`text-3xl font-bold ${youWin ? "text-amber-400" : "text-rose-500"}`}>
        {youWin ? "Victory" : "Bankrupt"}
      </h2>
      <p className="text-gray-400 mt-2">
        {youWin ? "The pot is yours." : "The chips have run dry."}
      </p>
      <button onClick={onAgain} className="mt-4 px-4 py-2 rounded bg-amber-500 text-black font-bold" id="btn-return-play">
        Return to Menu
      </button>
    </div>
  );
}
