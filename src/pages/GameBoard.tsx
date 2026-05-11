// Dead Man's Hand — FULL GAMEBOARD IMPLEMENTATION
// Includes all poker + TCG rules, log, animations, and modals.

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import toast from "react-hot-toast";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Crown, Coins, Flame, Skull, Sword, Shield, EyeOff,
  Zap, Package, Sparkles, MapPin, X, BookOpen,
  RotateCcw, Info, Ghost
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { newMatch, step, listLegalActions } from "../lib/dmh/engine";
import { chooseAction, type CpuDifficulty } from "../lib/dmh/cpu";
import type { Action, CardDef, MatchState, Player, PokerCard, Seat, Unit } from "../lib/dmh/types";
import { rankToString, suitSymbol } from "../lib/dmh/types";
import { cn } from "../lib/utils";
import { CardDisplay } from "../components/CardDisplay";

// ──────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ──────────────────────────────────────────────────────────────────────────
const SUIT_COLOR: Record<string, string> = {
  S: "text-white",
  C: "text-white",
  H: "text-rose-400",
  D: "text-rose-400",
};

const RARITY_CSS: Record<string, string> = {
  Common: "border-slate-500 shadow-slate-900/50",
  Uncommon: "border-green-600 shadow-green-900/50",
  Rare: "border-blue-600 shadow-blue-900/50",
  "Super-Rare": "border-purple-600 shadow-purple-900/50",
  Mythic: "border-yellow-500 shadow-yellow-900/50",
  Divine: "border-red-600 shadow-red-900/50",
};

// ──────────────────────────────────────────────────────────────────────────
// TYPES
// ──────────────────────────────────────────────────────────────────────────
interface InitState {
  deckId: string;
  deckName?: string;
  p1Deck: { leader: CardDef; cards: CardDef[] };
  p2Deck: { leader: CardDef; cards: CardDef[] };
  p1CardDefs: CardDef[];
  p2CardDefs: CardDef[];
  difficulty: CpuDifficulty;
  seed: number;
  user_id: string;
}

type UiMode =
  | { kind: "default" }
  | { kind: "pick_cast_seat"; cardId: string; validSeats: number[] }
  | { kind: "pick_assassinate_target"; validActions: Extract<Action, { type: "assassinate" }>[] }
  | { kind: "pick_fuel_card" }
  | { kind: "confirm_quit" };

// ──────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ──────────────────────────────────────────────────────────────────────────
export default function GameBoard() {
  const nav = useNavigate();
  const location = useLocation();
  const initState = location.state as InitState | null;

  const [state, setState] = useState<MatchState | null>(null);
  const [reveal, setReveal] = useState(false);
  const [uiMode, setUiMode] = useState<UiMode>({ kind: "default" });
  const [logOpen, setLogOpen] = useState(false);
  const cpuBusy = useRef(false);
  const reportedRef = useRef(false);
  const logEndRef = useRef<HTMLDivElement>(null);

  // ── Init ──────────────────────────────────────
  useEffect(() => {
    if (!initState) {
      toast.error("No match data. Returning to menu.");
      nav("/play");
      return;
    }
    const m = newMatch({
      p1: {
        user_id: initState.user_id,
        user_name: "You",
        deck: {
          leaderCardId: initState.p1Deck.leader.id,
          cards: initState.p1Deck.cards.map(c => c.id),
        },
        cardDefs: initState.p1CardDefs,
      },
      p2: {
        user_id: "cpu",
        user_name: "CPU",
        deck: {
          leaderCardId: initState.p2Deck.leader.id,
          cards: initState.p2Deck.cards.map(c => c.id),
        },
        cardDefs: initState.p2CardDefs,
      },
      seed: initState.seed,
    });
    setState(m);
  }, [initState, nav]);

  // ── CPU turn loop ──────────────────────────────
  useEffect(() => {
    if (!state || !initState) return;
    if (state.phase === "ended") return;
    if (state.activePlayer !== "B") return;
    if (cpuBusy.current) return;

    cpuBusy.current = true;
    const t = setTimeout(() => {
      const a = chooseAction(state, "B", initState.difficulty);
      if (a) setState(cur => cur ? step(cur, a) : cur);
      cpuBusy.current = false;
    }, 800);
    return () => clearTimeout(t);
  }, [state, initState]);

  // ── Auto-scroll log ────────────────────────────
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [state?.log.length, logOpen]);

  // ── Match end reporting ────────────────────────
  useEffect(() => {
    if (!state || state.phase !== "ended" || !initState || reportedRef.current) return;
    reportedRef.current = true;
    setReveal(true);
    const won = state.winner === "A";
    
    supabase.rpc("report_cpu_match_result", {
      p_deck_id: initState.deckId,
      p_difficulty: initState.difficulty,
      p_won: won,
      p_hands_played: state.handNumber,
      p_summary: {
        final_pot: state.pot.main + state.pot.phantom,
        logs: state.log.slice(-10),
        player_stash: state.players.A.stash,
        cpu_stash: state.players.B.stash,
      },
    }).then(({ error }) => {
      if (!error) {
        toast.success(won ? "Victory! XP awarded." : "Defeated. XP awarded for trying.");
      }
    });

    // Quests
    (async () => {
      if (won && state.location) {
        await supabase.rpc('increment_quest_progress', { p_quest_type: 'win_at_location', p_amount: 1 });
      }
      
      const assassinations = state.log.filter(l => 
        l.text.includes("assassinates") && l.side === "A"
      ).length;
      if (assassinations > 0) {
        await supabase.rpc("increment_quest_progress", {
          p_quest_type: "assassinate_unit", p_amount: assassinations
        });
      }

      if (won) {
        await supabase.rpc("increment_quest_progress", {
          p_quest_type: "win_match", p_amount: 1
        });
        toast.success("Deck quest progress: Win Match +1", { icon: "🏆", position: "bottom-right" });
      }
      await supabase.rpc("increment_quest_progress", {
        p_quest_type: "play_matches", p_amount: 1
      });
      // Small delay then check missions
      setTimeout(async () => {
        try {
          const { data: missions } = await supabase.rpc("get_daily_missions");
          const completedToday = (missions as any[])?.filter(m => m.is_completed);
          if (completedToday?.length > 0) {
            // We don't know for sure it was JUST completed without more state, 
            // but showing the current completed count is a good feedback.
          }
        } catch (e) {}
      }, 1000);
    })();
  }, [state, initState]);

  const act = useCallback((a: Action) => {
    if (!state || state.phase === "ended") return;
    setState(cur => cur ? step(cur, a) : cur);
    setUiMode({ kind: "default" });
  }, [state]);

  if (!state) return (
    <div className="min-h-screen bg-emerald-950 flex items-center justify-center text-amber-400 font-black uppercase tracking-widest animate-pulse">
      Initializing Casino Floor…
    </div>
  );

  const me = state.players.A;
  const cpu = state.players.B;
  const myActions = listLegalActions(state, "A");
  const isMyTurn = state.activePlayer === "A" && state.phase !== "ended";

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-950 via-emerald-900 to-emerald-950 text-white flex flex-col font-sans select-none overflow-hidden" id="game-board-container">
      {/* ── HEADER ── */}
      <header className="bg-black/80 border-b-2 border-amber-900/60 h-14 flex items-center justify-between px-4 z-40 backdrop-blur-md" id="match-header">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setUiMode({ kind: "confirm_quit" })}
            className="text-gray-400 hover:text-white transition-colors flex items-center gap-2 text-xs font-black uppercase"
          >
            <X className="w-4 h-4" /> Quit
          </button>
          <div className="h-6 w-px bg-white/10" />
          <div className="flex flex-col">
            <span className="text-amber-400 font-black text-sm uppercase leading-none">Hand {state.handNumber}</span>
            {initState?.deckName && <span className="text-[10px] text-amber-500/50 font-bold uppercase mt-0.5 line-clamp-1">{initState.deckName}</span>}
            <span className="text-[10px] text-gray-500 font-bold uppercase">{state.phase} round</span>
          </div>
        </div>

        <div className="flex items-center gap-6">
          {state.location && (
            <div className="flex flex-col items-center">
              <span className="text-[10px] text-amber-500/70 font-black uppercase leading-none mb-0.5">Location</span>
              <div className="flex items-center gap-2 bg-amber-950/40 border border-amber-700/40 px-3 py-1 rounded-full shadow-[0_0_15px_rgba(251,191,36,0.1)]">
                <MapPin className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-xs font-black uppercase text-amber-300">{state.location.keyword} {romanize(state.location.tier)}</span>
              </div>
            </div>
          )}
          <div className="h-8 w-px bg-white/10" />
          <div className="flex flex-col items-end">
            <span className="text-[10px] text-gray-500 font-black uppercase leading-none">Blind</span>
            <span className="text-amber-300 font-black font-mono text-sm">{state.bigBlind / 2} / {state.bigBlind}</span>
          </div>
          <button 
            onClick={() => setLogOpen(v => !v)}
            className={cn(
              "p-2 rounded-lg transition-all",
              logOpen ? "bg-amber-500 text-black shadow-lg" : "bg-white/5 text-gray-400 hover:text-white"
            )}
          >
            <BookOpen className="w-5 h-5" />
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden relative">
        {/* ── MAIN GAME AREA ── */}
        <div className="flex-1 flex flex-col overflow-y-auto relative scrollbar-hide">
          {/* CPU SIDE */}
          <section className="p-4 border-b-2 border-emerald-800/40 bg-black/10" id="cpu-side">
            <PlayerPanel
              player={cpu}
              side="B"
              reveal={reveal || state.phase === "showdown"}
              isOpponent
              state={state}
            />
          </section>

          {/* TABLE CENTER */}
          <section className="flex-1 min-h-[220px] flex flex-col items-center justify-center relative p-4" id="table-center">
            <CommunityArea state={state} />
            <PotDisplay pot={state.pot} />
          </section>

          {/* PLAYER SIDE */}
          <section className="p-4 border-t-2 border-emerald-800/40 bg-black/10" id="player-side">
            <PlayerPanel
              player={me}
              side="A"
              reveal={true}
              state={state}
              uiMode={uiMode}
              onSeatClick={(seatIdx) => {
                if (uiMode.kind === "pick_cast_seat") {
                  if (uiMode.validSeats.includes(seatIdx)) {
                    act({ type: "cast", cardId: uiMode.cardId, seat: seatIdx as 0|1|2 });
                  }
                }
              }}
            />
          </section>

          {/* TCG HAND PANEL */}
          <TcgHandSection
            player={me}
            state={state}
            myActions={myActions}
            isMyTurn={isMyTurn}
            uiMode={uiMode}
            setUiMode={setUiMode}
            act={act}
          />

          {/* ACTION BAR (Fixed at bottom center) */}
          <div className="sticky bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black via-black/80 to-transparent z-40">
            {state.phase === "ended" ? (
              <EndScreenHandover state={state} onAgain={() => nav("/play")} />
            ) : (
              <ActionBar
                state={state}
                myActions={myActions}
                isMyTurn={isMyTurn}
                uiMode={uiMode}
                setUiMode={setUiMode}
                act={act}
              />
            )}
          </div>
        </div>

        {/* ── GAME LOG SIDEBAR ── */}
        <AnimatePresence>
          {logOpen && (
            <motion.aside
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 320, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className="bg-black/95 border-l-2 border-amber-900/60 flex flex-col z-50 shadow-2xl backdrop-blur-xl"
            >
              <div className="flex items-center justify-between p-4 border-b border-white/10 bg-gray-900/50">
                <span className="text-xs font-extrabold text-amber-400 uppercase tracking-tighter">Casino Transcripts</span>
                <button onClick={() => setLogOpen(false)} className="bg-white/5 p-1 rounded-md hover:bg-white/10">
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                {state.log.map((entry, i) => (
                  <motion.div 
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    key={i} 
                    className="group"
                  >
                    <div className="text-[10px] font-black text-gray-600 uppercase mb-0.5 tracking-widest">{entry.phase}</div>
                    <div className={cn(
                      "text-[13px] leading-relaxed py-2 px-3 rounded-lg border-l-4 transition-colors",
                      entry.text.includes("wins") ? "bg-amber-500/10 border-amber-500 text-amber-100" :
                      entry.text.includes("bankrupt") ? "bg-red-500/10 border-red-500 text-red-200" :
                      entry.text.includes("assassinate") ? "bg-orange-500/10 border-orange-500 text-orange-200" :
                      "bg-white/5 border-gray-600 text-gray-300"
                    )}>
                      {entry.text}
                    </div>
                  </motion.div>
                ))}
                <div ref={logEndRef} />
              </div>
            </motion.aside>
          )}
        </AnimatePresence>
      </div>

      {/* ── QUIT CONFIRM MODAL ── */}
      {uiMode.kind === "confirm_quit" && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] backdrop-blur-sm p-4">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-gray-900 border-2 border-red-800 rounded-3xl p-8 max-w-sm w-full shadow-[0_20px_50px_rgba(220,38,38,0.3)] text-center"
          >
            <div className="mb-4 inline-flex p-4 rounded-full bg-red-950/50 border border-red-700/50">
              <Skull className="w-12 h-12 text-red-500" />
            </div>
            <h3 className="text-2xl font-black text-white mb-2 uppercase tracking-tight">Forfeit?</h3>
            <p className="text-gray-400 text-sm mb-8 leading-relaxed">Leaving now counts as a <span className="text-red-500 font-bold uppercase italic underline">total loss</span>. The house takes your stacks.</p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => nav("/play")}
                className="w-full py-4 bg-red-600 hover:bg-red-500 rounded-xl font-black uppercase text-sm tracking-widest transition-all hover:scale-105 active:scale-95 shadow-xl"
              >Yes, Forfeit</button>
              <button
                onClick={() => setUiMode({ kind: "default" })}
                className="w-full py-4 bg-gray-800 hover:bg-gray-700 rounded-xl font-black uppercase text-sm tracking-widest transition-all"
              >Stay in the Game</button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// SUB-COMPONENTS
// ──────────────────────────────────────────────────────────────────────────

function PlayerPanel({ player, side, reveal, isOpponent = false, state, uiMode, onSeatClick }: any) {
  const leaderDef = state.cardDefs[player.leaderCardId];

  return (
    <div className="grid grid-cols-12 gap-6 items-center">
      {/* 1. Leader & Stats */}
      <div className={cn(
        "col-span-12 lg:col-span-4 flex items-center gap-4",
        isOpponent ? "order-1 lg:order-1" : "order-1 lg:order-1"
      )}>
        <div className="relative group">
          <div className={cn(
            "w-20 h-20 rounded-2xl border-4 overflow-hidden bg-gray-800 shadow-2xl transition-all",
            leaderDef ? RARITY_CSS[leaderDef.rarity] ?? "border-gray-600" : "border-gray-600",
            player.leaderIgnited && "ring-4 ring-orange-500 ring-offset-4 ring-offset-emerald-950 animate-pulse"
          )}>
            {leaderDef?.image_url ? (
              <img src={leaderDef.image_url} alt={leaderDef.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-900"><Crown className="w-10 h-10 text-amber-400" /></div>
            )}
          </div>
          {player.leaderIgnited && (
            <motion.div 
              animate={{ opacity: [1, 0.5, 1], scale: [1, 1.2, 1] }} 
              transition={{ repeat: Infinity, duration: 1.5 }}
              className="absolute -top-2 -right-2 bg-orange-600 rounded-full p-2 border-2 border-white shadow-xl"
            >
              <Flame className="w-5 h-5 text-white" />
            </motion.div>
          )}
        </div>
        
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-xl font-black uppercase tracking-tight text-white">{player.name}</h2>
            {isOpponent && <span className="text-[10px] bg-red-950 text-red-300 px-2 py-0.5 rounded-full font-black uppercase border border-red-800">CPU</span>}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            <div className="flex items-center gap-1.5">
              <Coins className="w-4 h-4 text-amber-400" />
              <span className="text-lg font-black font-mono text-amber-300 leading-none">{player.stash}</span>
            </div>
            <div className="flex items-center gap-1.5 grayscale opacity-60 hover:grayscale-0 hover:opacity-100 transition-all cursor-help" title="Fuel Capacity">
              <Zap className="w-4 h-4 text-yellow-400" />
              <span className="text-sm font-black text-yellow-300 leading-none">{player.leaderFuel}/3</span>
            </div>
            {player.leaderWounds > 0 && (
              <div className="flex items-center gap-1.5">
                <Skull className="w-4 h-4 text-red-500" />
                <span className="text-sm font-black text-red-400 leading-none">{player.leaderWounds}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. Casino Seats */}
      <div className={cn(
        "col-span-12 lg:col-span-5 grid grid-cols-3 gap-3",
        isOpponent ? "order-3 lg:order-2" : "order-3 lg:order-2"
      )}>
        {player.seats.map((seat: Seat) => (
          <SeatSlot
            key={seat.index}
            seat={seat}
            seatIndex={seat.index}
            state={state}
            playerSide={player.side}
            uiMode={uiMode}
            onSeatClick={onSeatClick}
            isOpponent={isOpponent}
          />
        ))}
      </div>

      {/* 3. Hole Cards */}
      <div className={cn(
        "col-span-12 lg:col-span-3 flex justify-end gap-3",
        isOpponent ? "order-2 lg:order-3" : "order-2 lg:order-3"
      )}>
        {player.holeCards.map((c: PokerCard, i: number) => {
          const isVisible = reveal || !isOpponent || c.faceUp;
          return (
            <motion.div
              key={i}
              initial={{ rotateY: 180 }}
              animate={{ rotateY: isVisible ? 0 : 180 }}
              transition={{ duration: 0.5 }}
              className="relative w-14 h-20 perspective-1000"
            >
              {isVisible ? (
                <div className={cn(
                  "absolute inset-0 bg-white rounded-xl shadow-xl flex flex-col items-center justify-center border-2",
                  c.faceUp ? "border-blue-500 animate-pulse" : "border-gray-200"
                )}>
                  <span className={cn("text-xl font-black leading-none", SUIT_COLOR[c.suit])}>{rankToString(c.rank)}</span>
                  <span className={cn("text-lg leading-none mt-1", SUIT_COLOR[c.suit])}>{suitSymbol(c.suit)}</span>
                </div>
              ) : (
                <div 
                  className="absolute inset-0 rounded-xl shadow-xl border-2 border-amber-900/60 overflow-hidden bg-cover bg-center"
                  style={{ backgroundImage: player.cardBackImageUrl ? `url(${player.cardBackImageUrl})` : 'linear-gradient(135deg, #451a03 0%, #78350f 100%)' }}
                >
                  <div className="absolute inset-0 bg-black/20 flex items-center justify-center text-amber-500/20">
                    <Crown className="w-8 h-8 rotate-12" />
                  </div>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

function SeatSlot({ seat, seatIndex, state, playerSide, uiMode, onSeatClick, isOpponent }: any) {
  const isPickTarget = uiMode?.kind === "pick_cast_seat" && uiMode.validSeats.includes(seatIndex) && playerSide === "A";
  const isAssassinTarget = uiMode?.kind === "pick_assassinate_target" && isOpponent;

  return (
    <motion.div
      whileHover={isPickTarget || isAssassinTarget ? { scale: 1.05, y: -4 } : {}}
      onClick={() => (isPickTarget || isAssassinTarget) && onSeatClick?.(seatIndex)}
      className={cn(
        "rounded-2xl border-2 min-h-[90px] p-3 relative transition-all group overflow-hidden",
        seat.locked ? "border-red-900/60 bg-red-950/20 grayscale" :
        seat.unit ? "border-amber-700/40 bg-black/40 shadow-xl" :
        "border-white/5 bg-white/5",
        isPickTarget && "border-blue-400 bg-blue-900/20 cursor-pointer shadow-[0_0_30px_rgba(59,130,246,0.3)] ring-2 ring-blue-400 ring-offset-2 ring-offset-emerald-950",
        isAssassinTarget && "border-red-500 bg-red-900/20 cursor-pointer shadow-[0_0_30px_rgba(239,68,68,0.4)] ring-2 ring-red-500 ring-offset-2 ring-offset-emerald-950",
      )}
    >
      {seat.locked && <div className="absolute inset-0 backdrop-blur-[2px] flex items-center justify-center p-2"><Skull className="w-8 h-8 text-red-900/50" /></div>}
      
      {seat.unit && !seat.locked ? (
        <UnitBoardCard unit={seat.unit} state={state} />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-2 opacity-20 transition-opacity group-hover:opacity-40">
           {isPickTarget ? <Sparkles className="w-6 h-6 text-blue-400" /> : <div className="text-[10px] font-black uppercase tracking-widest text-gray-400">Seat {seatIndex+1}</div>}
        </div>
      )}
    </motion.div>
  );
}

function UnitBoardCard({ unit, state }: { unit: Unit; state: MatchState }) {
  const artDef = unit.artifactCardId ? state.cardDefs[unit.artifactCardId] : null;
  const def = (unit.baseDefense || 0) + (unit.bonusDefense || 0);

  return (
    <div className={cn("flex flex-col h-full", unit.exhausted && "opacity-40")}>
      <div className="flex items-center justify-between gap-1 mb-1.5">
        <span className="text-[11px] font-black uppercase text-amber-100 truncate flex-1 leading-none">{unit.name}</span>
        <div className="flex items-center gap-1 bg-blue-600 px-1.5 py-0.5 rounded shadow-[1px_2px_0px_rgba(0,0,0,0.5)]">
           <Shield className="w-2.5 h-2.5 text-white" />
           <span className="text-[10px] font-black text-white leading-none">{def}</span>
        </div>
      </div>
      
      <div className="flex flex-wrap gap-1 mt-auto">
        {unit.keyword && (
          <span className={cn(
            "text-[8px] font-black uppercase tracking-tighter px-1.5 rounded-sm",
            unit.silenced ? "bg-gray-800 text-gray-500 line-through" : "bg-indigo-600 text-white"
          )}>{unit.keyword} {romanize(unit.keywordTier || 1)}</span>
        )}
        {artDef && (
          <div className="group/art relative">
            <Package className="w-3.5 h-3.5 text-amber-500 animate-bounce" />
            <div className="absolute bottom-full left-0 mb-2 p-2 bg-black/95 text-[9px] font-bold text-amber-200 border border-amber-800 rounded opacity-0 group-hover/art:opacity-100 transition-opacity z-50 w-24">
              Equipped: {artDef.name}
            </div>
          </div>
        )}
      </div>
      {unit.exhausted && <div className="absolute top-1/2 left-0 w-full h-0.5 bg-rose-600 -rotate-12" />}
    </div>
  );
}

function CommunityArea({ state }: { state: MatchState }) {
  return (
    <div className="flex flex-wrap justify-center items-center gap-3 mb-12">
      {state.community.map((c, i) => (
        <motion.div
          key={i}
          initial={{ y: -50, opacity: 0, rotate: -15 }}
          animate={{ y: 0, opacity: 1, rotate: 0 }}
          transition={{ delay: i * 0.1, type: "spring", damping: 12 }}
          className="w-16 h-24 bg-white rounded-xl shadow-2xl border-4 border-gray-100 flex flex-col items-center justify-center"
        >
          <span className={cn("text-2xl font-black leading-none", SUIT_COLOR[c.suit])}>{rankToString(c.rank)}</span>
          <span className={cn("text-xl leading-none mt-1", SUIT_COLOR[c.suit])}>{suitSymbol(c.suit)}</span>
        </motion.div>
      ))}
      {Array.from({ length: 5 - state.community.length }).map((_, i) => (
        <div key={`ph-${i}`} className="w-16 h-24 rounded-xl border-2 border-dashed border-emerald-800/40 bg-black/20" />
      ))}
    </div>
  );
}

function PotDisplay({ pot }: { pot: { main: number; phantom: number } }) {
  const total = pot.main + pot.phantom;
  return (
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 translate-y-8 flex flex-col items-center">
      <div className="flex items-center gap-4 bg-black/60 border-2 border-amber-600/40 px-8 py-3 rounded-2xl shadow-[0_10px_40px_rgba(251,191,36,0.2)] backdrop-blur-md">
        <Coins className="w-8 h-8 text-amber-400 drop-shadow-[0_0_10px_rgba(251,191,36,0.6)]" />
        <div className="flex flex-col">
          <span className="text-3xl font-black font-mono text-amber-300 leading-none">{total}</span>
          <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest text-center">Total Pot</span>
        </div>
      </div>
      {pot.phantom > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="mt-2 text-[10px] font-black uppercase text-blue-400 bg-blue-950/40 px-3 py-1 rounded-full border border-blue-900/50 italic"
        >
          {pot.phantom} phantom (Rule 8)
        </motion.div>
      )}
    </div>
  );
}

function TcgHandSection({ player, state, myActions, isMyTurn, uiMode, setUiMode, act }: any) {
  return (
    <section className="bg-black/40 border-t border-white/5 py-4 px-4 overflow-x-auto custom-scrollbar" id="tcg-hand-container">
      <div className="flex items-center gap-3 mb-3">
        <h3 className="text-xs font-black uppercase tracking-widest text-emerald-400 leading-none">Your Hand</h3>
        <div className="h-0.5 flex-1 bg-white/5" />
        {uiMode.kind === "pick_cast_seat" && (
           <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="flex items-center gap-2 text-blue-400 bg-blue-950/40 px-4 py-1 rounded-full border border-blue-800 text-[10px] font-black uppercase tracking-wide">
             <Sparkles className="w-3.5 h-3.5" /> Now select an empty Seat to deploy
             <button onClick={() => setUiMode({ kind: 'default' })} className="ml-2 text-gray-400 hover:text-white"><X className="w-3 h-3" /></button>
           </motion.div>
        )}
      </div>
      <div className="flex gap-4 min-w-max pb-2">
        {player.hand.map((cardId: string) => {
          const def = state.cardDefs[cardId];
          if (!def) return null;
          const castActs = myActions.filter((a: any) => a.type === "cast" && a.cardId === cardId);
          const foldCast = myActions.find((a: any) => a.type === "foldcast" && a.cardId === cardId);
          const fuelAct = myActions.find((a: any) => a.type === "fuel" && a.payload?.cardId === cardId);
          const affordable = player.stash >= (def.cast_cost || 0);
          const isSelected = uiMode.kind === "pick_cast_seat" && uiMode.cardId === cardId;

          return (
            <TcgHandCard
              key={cardId}
              def={def}
              isMyTurn={isMyTurn}
              affordable={affordable}
              isSelected={isSelected}
              onCast={() => {
                if (def.card_type === "Unit" || def.card_type === "Artifact") {
                  setUiMode({ kind: "pick_cast_seat", cardId, validSeats: castActs.map((a: any) => a.seat) });
                } else {
                  act(castActs[0]);
                }
              }}
              onFuel={() => act(fuelAct)}
              onFoldCast={() => act(foldCast)}
              canCast={castActs.length > 0}
              canFuel={!!fuelAct}
              canFoldCast={!!foldCast}
            />
          );
        })}
      </div>
    </section>
  );
}

function TcgHandCard({ def, isMyTurn, affordable, isSelected, onCast, onFuel, onFoldCast, canCast, canFuel, canFoldCast }: any) {
  return (
    <motion.div
      whileHover={isMyTurn && (canCast || canFuel) ? { y: -10, scale: 1.05 } : {}}
      className={cn(
        "w-40 bg-gray-900 rounded-2xl border-2 flex flex-col p-2.5 transition-all shadow-xl group cursor-default h-full min-h-[190px]",
        RARITY_CSS[def.rarity] ?? "border-gray-700",
        isSelected && "ring-4 ring-blue-500 ring-offset-4 ring-offset-emerald-950 scale-105",
        !isMyTurn || (!canCast && !canFuel) ? "opacity-50 grayscale contrast-75 bg-black" : "opacity-100"
      )}
    >
      <div className="relative w-full aspect-[4/3] rounded-xl overflow-hidden mb-2 bg-black shadow-inner">
        {def.image_url && <img src={def.image_url} alt={def.name} className="w-full h-full object-cover transition-transform group-hover:scale-110" />}
        <div className="absolute top-1 right-1 bg-black/80 px-1.5 py-0.5 rounded-lg border border-white/20 text-[10px] font-black text-amber-400 flex items-center gap-1">
          <Zap className="w-2.5 h-2.5" />{def.cast_cost}
        </div>
      </div>

      <div className="font-black text-xs uppercase text-white truncate mb-0.5 leading-none">{def.name}</div>
      <div className="text-[10px] text-gray-500 font-bold uppercase mb-2 flex items-center justify-between">
         <span className="truncate">{def.card_type} {def.keyword ? `· ${def.keyword}` : ''}</span>
         {def.defense && <span className="text-blue-400 bg-blue-950/40 px-1 rounded flex items-center gap-0.5"><Shield className="w-2.5 h-2.5" />{def.defense}</span>}
      </div>

      <div className="mt-auto flex flex-col gap-1.5">
        {canCast && (
          <button
            onClick={onCast}
            disabled={!affordable}
            className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[9px] font-black uppercase tracking-wider transition-all disabled:opacity-50 disabled:bg-gray-800"
          >
            {affordable ? "Cast Unit" : "Lack Chips"}
          </button>
        )}
        {canFoldCast && (
          <button onClick={onFoldCast} className="w-full py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-[9px] font-black uppercase tracking-wider">
            Fold-Cast
          </button>
        )}
        {canFuel && (
          <button onClick={onFuel} className="w-full py-1.5 bg-amber-600 hover:bg-amber-500 text-black rounded-lg text-[9px] font-black uppercase tracking-wider">
            Fuel Leader
          </button>
        )}
      </div>
    </motion.div>
  );
}

function ActionBar({ state, myActions, isMyTurn, uiMode, setUiMode, act }: any) {
  const hasCheck = myActions.some((a: any) => a.type === 'check');
  const hasFold = myActions.some((a: any) => a.type === 'fold');
  const callAct = myActions.find((a: any) => a.type === 'call');
  const raiseAct = myActions.find((a: any) => a.type === 'raise');
  const igniteAct = myActions.find((a: any) => a.type === 'ignite');
  const assassinateActs = myActions.filter((a: any) => a.type === 'assassinate');

  if (!isMyTurn) {
    return (
      <div className="flex items-center justify-center gap-4 py-4 animate-in fade-in duration-1000">
        <div className="flex gap-1.5">
          {[0, 1, 2].map(i => <motion.div key={i} animate={{ opacity: [0.2, 1, 0.2] }} transition={{ repeat: Infinity, duration: 1, delay: i*0.2 }} className="w-3 h-3 rounded-full bg-amber-500" />)}
        </div>
        <span className="text-lg font-black uppercase tracking-[0.4em] text-gray-500 italic">Opponent is thinking…</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 py-2">
      <div className="flex flex-wrap justify-center gap-4">
        {hasCheck && <ActionBtn label="Check" onClick={() => act({ type: 'check' })} variant="white" />}
        {callAct && <ActionBtn label={`Call ${callAct.amount || ''}`} onClick={() => act(callAct)} variant="primary" />}
        {raiseAct && <ActionBtn label={`Raise to ${raiseAct.amount}`} onClick={() => act(raiseAct)} variant="amber" />}
        
        <div className="w-px h-10 bg-white/10 mx-2" />
        
        {igniteAct && <ActionBtn label="Ignite Leader" onClick={() => act(igniteAct)} variant="rose" icon={<Flame className="w-5 h-5" />} />}
        {assassinateActs.length > 0 && (
          <ActionBtn 
            label={`Assassinate (${assassinateActs.length})`} 
            onClick={() => setUiMode({ kind: 'pick_assassinate_target', validActions: assassinateActs })} 
            variant="rose" 
            icon={<Skull className="w-5 h-5" />}
          />
        )}
        {hasFold && <ActionBtn label="Fold Hand" onClick={() => act({ type: 'fold' })} variant="danger" />}
      </div>

      {uiMode.kind === 'pick_assassinate_target' && (
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="bg-gray-900 border-2 border-red-800 rounded-3xl p-6 shadow-2xl max-w-2xl w-full flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-black text-red-500 uppercase flex items-center gap-2"><Skull className="w-4 h-4" /> Pick an assassination target</h4>
            <button onClick={() => setUiMode({ kind: 'default' })} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
          </div>
          <div className="flex flex-wrap gap-3">
             {uiMode.validActions.map((a: any, i: number) => {
               const targetUnit = state.players[a.targetSide].seats[a.seat].unit!;
               const holeCard = state.players.A.holeCards[a.holeCardIndex];
               return (
                 <button 
                   key={i} 
                   onClick={() => act(a)}
                   className="bg-red-950/40 border border-red-800/60 p-4 rounded-2xl hover:bg-red-900/40 transition-all text-left flex flex-col group min-w-[200px] flex-1"
                 >
                   <div className="text-[10px] font-black uppercase text-red-400 mb-1">Target Seat {a.seat + 1}</div>
                   <div className="text-white font-black text-lg mb-0.5">{targetUnit.name}</div>
                   <div className="text-xs text-gray-500 flex items-center justify-between mt-auto pt-2 border-t border-red-900/30">
                      <span className="flex items-center gap-1"><Shield className="w-3 h-3" /> DEF {targetUnit.baseDefense + targetUnit.bonusDefense}</span>
                      <span className="text-amber-400 font-bold italic">Using {rankToString(holeCard.rank)}{suitSymbol(holeCard.suit)}</span>
                   </div>
                 </button>
               );
             })}
          </div>
        </motion.div>
      )}
    </div>
  );
}

function ActionBtn({ label, onClick, variant = "default", icon }: any) {
  const themes = {
    default: "bg-gray-800 text-white hover:bg-gray-700",
    white: "bg-white text-black hover:bg-gray-200",
    primary: "bg-emerald-600 text-white hover:bg-emerald-500 shadow-[0_10px_20px_rgba(5,150,105,0.3)]",
    amber: "bg-amber-500 text-black hover:bg-amber-400 shadow-[0_10px_20px_rgba(245,158,11,0.3)]",
    rose: "bg-rose-600 text-white hover:bg-rose-500 shadow-[0_10px_20px_rgba(225,29,72,0.3)]",
    danger: "bg-transparent text-red-500 border-2 border-red-900/50 hover:bg-red-900/20",
  }[variant as "default"];

  return (
    <button
      onClick={onClick}
      className={cn(
        "px-6 py-3 rounded-2xl font-black uppercase text-sm tracking-widest transition-all scale-100 active:scale-95 flex items-center gap-2",
        themes
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function EndScreenHandover({ state, onAgain }: any) {
  const won = state.winner === "A";
  return (
    <div className="flex flex-col items-center gap-6 py-8 animate-in fade-in zoom-in duration-700">
       <div className={cn("text-6xl font-black italic uppercase tracking-tighter drop-shadow-2xl", won ? "text-amber-400" : "text-red-600")}>
         {won ? "Victory!" : "Defeated"}
       </div>
       <div className="flex gap-8">
         <div className="flex flex-col items-center">
            <span className="text-[10px] font-black uppercase text-gray-500">Your Final Stack</span>
            <span className="text-3xl font-black font-mono text-amber-300">{state.players.A.stash}</span>
         </div>
         <div className="flex flex-col items-center border-l border-white/10 pl-8">
            <span className="text-[10px] font-black uppercase text-gray-500">Hands Survived</span>
            <span className="text-3xl font-black font-mono text-white">{state.handNumber}</span>
         </div>
       </div>
       <button
         onClick={onAgain}
         className="mt-4 px-12 py-5 bg-amber-500 text-black font-black uppercase tracking-[0.2em] rounded-2xl hover:bg-amber-400 hover:scale-110 active:scale-95 transition-all shadow-[0_15px_40px_rgba(251,191,36,0.5)]"
       >
         Play Another Match
       </button>
    </div>
  );
}

function romanize(n: any) {
  if (n === 1) return "I";
  if (n === 2) return "II";
  if (n === 3) return "III";
  return n;
}
