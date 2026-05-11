// src/pages/GameBoard.tsx
// Major update:
//   • Full-screen layout (no Layout wrapper, own page)
//   • Multi-CPU tournament mode — defeat each CPU sequentially
//   • Full-sized card viewing with click-to-expand modals
//   • Keyword tier badges + inline explainers
//   • CPU AI accounts for tournament context (harder per round)
//   • Better visual layout with player info panels

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import toast from "react-hot-toast";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Crown, Coins, Flame, Skull, Sword, Shield, EyeOff,
  Zap, Package, Sparkles, MapPin, X, BookOpen,
  RotateCcw, Info, Ghost, Trophy, ChevronRight, Users,
  Star
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { newMatch, step, listLegalActions } from "../lib/dmh/engine";
import { chooseAction, type CpuDifficulty } from "../lib/dmh/cpu";
import type { Action, CardDef, MatchState, Player, PokerCard, Seat, Unit } from "../lib/dmh/types";
import { rankToString, suitSymbol } from "../lib/dmh/types";
import { cn } from "../lib/utils";
import { CardDisplay } from "../components/CardDisplay";
import { CardExpandModal } from "../components/CardExpandModal";

// ── Helpers ──────────────────────────────────────────────────────────────────
const SUIT_COLOR: Record<string, string> = {
  S: "text-white", C: "text-white", H: "text-rose-400", D: "text-rose-400",
};
const RARITY_CSS: Record<string, string> = {
  Common: "border-slate-500",
  Uncommon: "border-green-600",
  Rare: "border-blue-600",
  "Super-Rare": "border-purple-600",
  Mythic: "border-yellow-500",
  Divine: "border-red-600",
};
function romanize(n: number) { return ['', 'I', 'II', 'III'][n] ?? n; }

interface CpuSlotConfig { name: string; difficulty: CpuDifficulty; }

interface InitState {
  deckId: string;
  deckName?: string;
  p1Deck: { leader: CardDef; cards: CardDef[] };
  p2Deck: { leader: CardDef; cards: CardDef[] };
  p1CardDefs: CardDef[];
  p2CardDefs: CardDef[];
  difficulty: CpuDifficulty;
  cpuSlots?: CpuSlotConfig[];   // NEW: tournament CPU list
  seed: number;
  user_id: string;
}

type UiMode =
  | { kind: "default" }
  | { kind: "pick_cast_seat"; cardId: string; validSeats: number[] }
  | { kind: "pick_assassinate_target"; validActions: Extract<Action, { type: "assassinate" }>[] }
  | { kind: "pick_fuel_card" }
  | { kind: "confirm_quit" }
  | { kind: "expand_card"; card: CardDef };

// ── TOURNAMENT STATE ─────────────────────────────────────────────────────────
interface TournamentState {
  cpuSlots: CpuSlotConfig[];
  currentRound: number;      // 0-indexed
  wins: number;
  playerStartStash: number;  // carry-over stash
  complete: boolean;
}

// ── MAIN COMPONENT ───────────────────────────────────────────────────────────
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

  // Tournament
  const [tournament, setTournament] = useState<TournamentState | null>(null);
  const [showRoundBanner, setShowRoundBanner] = useState(false);
  const [roundBannerText, setRoundBannerText] = useState('');

  // ── Init ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!initState) {
      toast.error("No match data. Returning to menu.");
      nav("/play");
      return;
    }
    const slots = initState.cpuSlots ?? [{ name: 'CPU', difficulty: initState.difficulty }];
    setTournament({
      cpuSlots: slots,
      currentRound: 0,
      wins: 0,
      playerStartStash: 1000,
      complete: false,
    });
    startRound(slots, 0, 1000);
  }, []);

  function startRound(slots: CpuSlotConfig[], round: number, stash: number) {
    if (!initState) return;
    const slot = slots[round];
    setRoundBannerText(slots.length > 1 ? `Round ${round + 1} of ${slots.length} — vs ${slot.name}` : `vs ${slot.name}`);
    setShowRoundBanner(true);
    setTimeout(() => setShowRoundBanner(false), 2500);
    cpuBusy.current = false;
    reportedRef.current = false;
    setReveal(false);
    setUiMode({ kind: "default" });

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
        user_name: slot.name,
        deck: {
          leaderCardId: initState.p2Deck.leader.id,
          cards: initState.p2Deck.cards.map(c => c.id),
        },
        cardDefs: initState.p2CardDefs,
      },
      seed: (initState.seed + round * 12345) & 0xffffffff,
    });

    // Apply carry-over stash for player
    const mWithStash = {
      ...m,
      players: {
        ...m.players,
        A: { ...m.players.A, stash: stash },
        B: { ...m.players.B, stash: 1000 }, // CPU always starts fresh
      }
    };
    setState(mWithStash);
  }

  // ── CPU turn loop ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!state || !initState || !tournament) return;
    if (state.phase === "ended") return;
    if (state.activePlayer !== "B") return;
    if (cpuBusy.current) return;

    cpuBusy.current = true;
    const slot = tournament.cpuSlots[tournament.currentRound];
    const t = setTimeout(() => {
      const a = chooseAction(state, "B", slot.difficulty);
      if (a) setState(cur => cur ? step(cur, a) : cur);
      cpuBusy.current = false;
    }, 800);
    return () => clearTimeout(t);
  }, [state, initState, tournament]);

  // ── Log auto-scroll ───────────────────────────────────────────────────────
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [state?.log.length, logOpen]);

  // ── Match end handling ────────────────────────────────────────────────────
  useEffect(() => {
    if (!state || state.phase !== "ended" || !initState || !tournament || reportedRef.current) return;
    reportedRef.current = true;
    setReveal(true);

    const won = state.winner === "A";
    const slot = tournament.cpuSlots[tournament.currentRound];
    const isLastRound = tournament.currentRound >= tournament.cpuSlots.length - 1;

    // Report to Supabase
    supabase.rpc("report_cpu_match_result", {
      p_deck_id: initState.deckId,
      p_difficulty: slot.difficulty,
      p_won: won,
      p_hands_played: state.handNumber,
      p_summary: {
        final_pot: state.pot.main + state.pot.phantom,
        logs: state.log.slice(-10),
        player_stash: state.players.A.stash,
        cpu_stash: state.players.B.stash,
        round: tournament.currentRound + 1,
        tournament_size: tournament.cpuSlots.length,
      },
    }).then(() => {
      toast.success(won ? "Victory! XP awarded." : "Defeated. Better luck next time.", { icon: won ? "🏆" : "💀" });
    });

    // Quest progress
    (async () => {
      if (won && state.location) {
        await supabase.rpc('increment_quest_progress', { p_quest_type: 'win_at_location', p_amount: 1 });
      }
      const assassinations = state.log.filter(l => l.text.includes("assassinates") && l.side === "A").length;
      if (assassinations > 0) {
        await supabase.rpc("increment_quest_progress", { p_quest_type: "assassinate_unit", p_amount: assassinations });
      }
      if (won) {
        await supabase.rpc("increment_quest_progress", { p_quest_type: "win_match", p_amount: 1 });
      }
      await supabase.rpc("increment_quest_progress", { p_quest_type: "play_matches", p_amount: 1 });
    })();

    // Tournament progression
    if (won && !isLastRound) {
      // Player advances: carry their stash forward
      const carryStash = state.players.A.stash + 100; // +100 bonus per win
      
      // Update tournament state first to ensure startRound has correct values via closure or state
      // Actually, we can just call startRound with next values.
      setTournament(prev => prev ? { ...prev, currentRound: prev.currentRound + 1, wins: prev.wins + 1, playerStartStash: carryStash } : prev);
      
      // Brief delay then start next round
      setTimeout(() => {
        // Need to be careful about closure here. We can use the current tournament data and increment it.
        startRound(tournament.cpuSlots, tournament.currentRound + 1, carryStash);
      }, 3500);
    } else if (won && isLastRound) {
      setTournament(prev => prev ? { ...prev, wins: prev.wins + 1, complete: true } : prev);
    }
  }, [state?.phase, state?.winner]);

  const act = useCallback((a: Action) => {
    if (!state || state.phase === "ended") return;
    setState(cur => cur ? step(cur, a) : cur);
    setUiMode({ kind: "default" });
  }, [state]);

  // ── Loading ───────────────────────────────────────────────────────────────
  if (!state) return (
    <div className="fixed inset-0 bg-emerald-950 flex items-center justify-center text-amber-400 font-black uppercase tracking-widest animate-pulse">
      Shuffling the Deck…
    </div>
  );

  const me = state.players.A;
  const cpu = state.players.B;
  const myActions = listLegalActions(state, "A");
  const isMyTurn = state.activePlayer === "A" && state.phase !== "ended";
  const currentSlot = tournament?.cpuSlots[tournament.currentRound];
  const isMultiRound = (tournament?.cpuSlots.length ?? 1) > 1;

  return (
    <div className="fixed inset-0 bg-gradient-to-b from-emerald-950 via-emerald-900 to-emerald-950 text-white flex flex-col font-sans select-none overflow-hidden z-50">

      {/* ── ROUND BANNER (tournament) ── */}
      <AnimatePresence>
        {showRoundBanner && (
          <motion.div
            className="absolute inset-0 flex items-center justify-center z-[100] pointer-events-none"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.2 }}
          >
            <div className="bg-black/90 border-2 border-amber-500 rounded-2xl px-12 py-6 text-center backdrop-blur-xl shadow-[0_0_60px_rgba(251,191,36,0.4)]">
              <p className="text-amber-400 font-black text-3xl uppercase tracking-widest">{roundBannerText}</p>
              {isMultiRound && tournament && (
                <p className="text-amber-600 text-sm font-bold mt-2">
                  {tournament.wins} win{tournament.wins !== 1 ? 's' : ''} so far
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── HEADER ── */}
      <header className="bg-black/80 border-b-2 border-amber-900/60 h-14 flex items-center justify-between px-4 z-40 backdrop-blur-md flex-shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setUiMode({ kind: "confirm_quit" })}
            className="text-gray-400 hover:text-white transition-colors flex items-center gap-1.5 text-xs font-black uppercase"
          >
            <X className="w-4 h-4" /> Quit
          </button>
          <div className="h-6 w-px bg-white/10" />
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-amber-400 font-black text-sm uppercase">Hand {state.handNumber}</span>
              {isMultiRound && tournament && (
                <span className="text-[9px] font-black text-amber-600 bg-amber-900/30 px-1.5 py-0.5 rounded-full uppercase">
                  R{tournament.currentRound + 1}/{tournament.cpuSlots.length}
                </span>
              )}
            </div>
            <span className="text-[10px] text-gray-500 font-bold uppercase">{state.phase} phase</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {state.location && (
            <div className="flex items-center gap-1.5 bg-amber-950/40 border border-amber-700/40 px-3 py-1 rounded-full">
              <MapPin className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-xs font-black uppercase text-amber-300">{state.location.keyword} {romanize(state.location.tier)}</span>
            </div>
          )}
          <div className="text-right">
            <span className="text-[9px] text-gray-500 font-black uppercase block">Blind</span>
            <span className="text-amber-300 font-black font-mono text-sm">{state.bigBlind / 2}/{state.bigBlind}</span>
          </div>
          <button
            onClick={() => setLogOpen(v => !v)}
            className={cn("p-2 rounded-lg transition-all", logOpen ? "bg-amber-500 text-black" : "bg-white/5 text-gray-400 hover:text-white")}
          >
            <BookOpen className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* ── MAIN AREA ── */}
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* ── CPU SIDE ── */}
          <section className="flex-shrink-0 p-3 border-b-2 border-emerald-800/40 bg-black/20">
            <PlayerPanel
              player={cpu}
              side="B"
              reveal={reveal || state.phase === "showdown"}
              isOpponent
              state={state}
              currentSlotName={currentSlot?.name}
              onCardExpand={(card: CardDef) => setUiMode({ kind: "expand_card", card })}
            />
          </section>

          {/* ── CENTER TABLE ── */}
          <section className="flex-1 flex flex-col items-center justify-center p-4 relative min-h-0">
            {/* Tournament Track */}
            {isMultiRound && tournament && (
              <div className="absolute top-4 inset-x-0 flex justify-center pointer-events-none">
                <div className="flex items-center gap-2 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-amber-900/40">
                  <Users className="w-3 h-3 text-amber-600" />
                  <div className="flex gap-1.5">
                    {tournament.cpuSlots.map((slot, i) => (
                      <div 
                        key={i} 
                        className={cn(
                          "w-2.5 h-2.5 rounded-full border transition-all duration-500",
                          i < tournament.currentRound ? "bg-amber-600 border-amber-500 shadow-[0_0_5px_rgba(251,191,36,0.5)]" :
                          i === tournament.currentRound ? "bg-white border-white animate-pulse shadow-[0_0_10px_white]" :
                          "bg-gray-800 border-gray-700"
                        )}
                        title={slot.name}
                      />
                    ))}
                  </div>
                  <span className="text-[9px] font-black text-amber-500 uppercase ml-1">Tournament Circuit</span>
                </div>
              </div>
            )}
            
            <CommunityArea state={state} />
            <PotDisplay pot={state.pot} />
          </section>

          {/* ── PLAYER SIDE ── */}
          <section className="flex-shrink-0 p-3 border-t-2 border-emerald-800/40 bg-black/20">
            <PlayerPanel
              player={me}
              side="A"
              reveal
              state={state}
              uiMode={uiMode}
              onSeatClick={(seatIdx: number) => {
                if (uiMode.kind === "pick_cast_seat" && uiMode.validSeats.includes(seatIdx)) {
                  act({ type: "cast", cardId: uiMode.cardId, seat: seatIdx as 0|1|2 });
                }
              }}
              onCardExpand={(card: CardDef) => setUiMode({ kind: "expand_card", card })}
            />
          </section>

          {/* ── HAND & ACTION BAR ── */}
          <div className="flex-shrink-0 border-t-2 border-emerald-800/30 bg-black/30">
            <TcgHandSection
              player={me}
              state={state}
              myActions={myActions}
              isMyTurn={isMyTurn}
              uiMode={uiMode}
              setUiMode={setUiMode}
              act={act}
              onExpandCard={(card: CardDef) => setUiMode({ kind: "expand_card", card })}
            />
            <div className="px-4 pb-4">
              {state.phase === "ended" ? (
                <EndScreen
                  won={state.winner === "A"}
                  tournament={tournament}
                  isLastRound={!tournament || tournament.currentRound >= tournament.cpuSlots.length - 1}
                  onPlayAgain={() => nav("/play")}
                />
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
        </div>

        {/* ── GAME LOG SIDEBAR ── */}
        <AnimatePresence>
          {logOpen && (
            <motion.aside
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="w-80 border-l-2 border-emerald-800/40 bg-black/60 flex flex-col overflow-hidden flex-shrink-0 backdrop-blur-sm"
            >
              <div className="p-3 border-b border-emerald-800/40 flex items-center justify-between">
                <span className="text-xs font-black uppercase text-gray-400">Game Log</span>
                <button onClick={() => setLogOpen(false)} className="text-gray-600 hover:text-white"><X className="w-4 h-4" /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-1 text-xs">
                {state.log.map((entry, i) => (
                  <motion.div key={i} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}>
                    <div className={cn(
                      "px-2 py-1.5 rounded border text-xs leading-snug",
                      entry.text.includes("wins") || entry.text.includes("Victory") ? "bg-amber-500/10 border-amber-500 text-amber-100" :
                      entry.text.includes("bankrupt") ? "bg-red-500/10 border-red-500 text-red-200" :
                      entry.text.includes("assassinate") ? "bg-orange-500/10 border-orange-500 text-orange-200" :
                      "bg-white/5 border-gray-700 text-gray-400"
                    )}>{entry.text}</div>
                  </motion.div>
                ))}
                <div ref={logEndRef} />
              </div>
            </motion.aside>
          )}
        </AnimatePresence>
      </div>

      {/* ── CARD EXPAND MODAL ── */}
      {uiMode.kind === "expand_card" && (
        <CardExpandModal
          card={uiMode.card}
          onClose={() => setUiMode({ kind: "default" })}
        />
      )}

      {/* ── QUIT CONFIRM MODAL ── */}
      {uiMode.kind === "confirm_quit" && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] backdrop-blur-sm p-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-gray-900 border-2 border-red-800 rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl"
          >
            <div className="mb-4 inline-flex p-4 rounded-full bg-red-950/50 border border-red-700/50">
              <Skull className="w-12 h-12 text-red-500" />
            </div>
            <h3 className="text-2xl font-black text-white mb-2 uppercase">Forfeit?</h3>
            <p className="text-gray-400 text-sm mb-8">Leaving counts as a <span className="text-red-500 font-bold">total loss</span>.</p>
            <div className="flex flex-col gap-3">
              <button onClick={() => nav("/play")} className="w-full py-4 bg-red-600 hover:bg-red-500 rounded-xl font-black uppercase text-sm tracking-widest transition-all">
                Yes, Forfeit
              </button>
              <button onClick={() => setUiMode({ kind: "default" })} className="w-full py-4 bg-gray-800 hover:bg-gray-700 rounded-xl font-black uppercase text-sm transition-all">
                Stay in the Game
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

// ── END SCREEN ───────────────────────────────────────────────────────────────
function EndScreen({ won, tournament, isLastRound, onPlayAgain }: { won: boolean; tournament: TournamentState | null; isLastRound: boolean; onPlayAgain: () => void }) {
  const isWinningTournament = won && isLastRound && tournament && tournament.wins > 0;
  const advancingToNext = won && !isLastRound;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "rounded-2xl p-4 flex flex-col items-center gap-3 border-2",
        isWinningTournament ? "bg-amber-900/30 border-amber-600" :
        advancingToNext ? "bg-emerald-900/30 border-emerald-600" :
        won ? "bg-emerald-900/30 border-emerald-600" :
        "bg-red-900/30 border-red-700"
      )}
    >
      <div className="flex items-center gap-2">
        {isWinningTournament ? <Trophy className="w-6 h-6 text-amber-400" /> :
         advancingToNext ? <ChevronRight className="w-6 h-6 text-emerald-400" /> :
         won ? <Trophy className="w-6 h-6 text-emerald-400" /> :
         <Skull className="w-6 h-6 text-red-400" />}
        <span className="font-black uppercase text-sm">
          {isWinningTournament ? `Tournament Complete! ${tournament!.wins} wins!` :
           advancingToNext ? `Victory! Advancing to next round...` :
           won ? "Victory!" : "Defeated"}
        </span>
      </div>
      {(!advancingToNext) && (
        <button onClick={onPlayAgain} className="px-6 py-2 bg-amber-500 hover:bg-amber-400 text-black font-black uppercase rounded-xl text-sm transition-all">
          Play Again
        </button>
      )}
    </motion.div>
  );
}

// ── PLAYER PANEL ─────────────────────────────────────────────────────────────
function PlayerPanel({ player, side, reveal, isOpponent = false, state, uiMode, onSeatClick, currentSlotName, onCardExpand }: any) {
  const leaderDef = state.cardDefs[player.leaderCardId];

  return (
    <div className={cn("flex gap-3 items-start", isOpponent ? "flex-row" : "flex-row-reverse")}>
      {/* Leader + Stats */}
      <div className="flex-shrink-0 flex flex-col items-center gap-2 w-24">
        {/* Leader card */}
        <div
          className="w-16 h-24 relative cursor-pointer group"
          onClick={() => leaderDef && onCardExpand?.(leaderDef)}
        >
          {leaderDef?.image_url ? (
            <img src={leaderDef.image_url} alt={leaderDef.name} className="w-full h-full object-cover rounded-lg border-2 border-amber-500 shadow-lg group-hover:border-amber-300 transition-colors" />
          ) : (
            <div className="w-full h-full bg-amber-900/40 border-2 border-amber-600 rounded-lg flex items-center justify-center">
              <Crown className="w-6 h-6 text-amber-400" />
            </div>
          )}
          {player.leaderIgnited && (
            <div className="absolute -top-1 -right-1 bg-orange-500 rounded-full p-0.5 animate-pulse">
              <Flame className="w-3 h-3 text-white" />
            </div>
          )}
          {/* Hover to expand hint */}
          <div className="absolute inset-0 bg-black/60 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <Info className="w-4 h-4 text-white" />
          </div>
        </div>

        {/* Stash */}
        <div className="bg-black/60 border border-amber-700/40 rounded-lg px-2 py-1 text-center w-full">
          <p className="text-[8px] text-amber-500/60 font-black uppercase">Stash</p>
          <p className="text-amber-300 font-black font-mono text-sm leading-none">{player.stash.toLocaleString()}</p>
        </div>

        {/* Name */}
        <p className="text-[9px] font-black uppercase text-gray-400 text-center truncate w-full">
          {currentSlotName || player.name}
        </p>

        {/* Fuel pips */}
        {leaderDef?.keyword === 'Fuel' && (
          <div className="flex gap-0.5">
            {[0,1,2].map(i => (
              <div key={i} className={cn("w-2 h-2 rounded-full border", i < player.leaderFuel ? "bg-amber-500 border-amber-400" : "bg-gray-700 border-gray-600")} />
            ))}
          </div>
        )}
      </div>

      {/* Seats (3 unit slots) */}
      <div className="flex-1 flex gap-2">
        {player.seats.map((seat: Seat, i: number) => (
          <SeatCard
            key={i}
            seat={seat}
            seatIndex={i}
            reveal={reveal}
            isOpponent={isOpponent}
            state={state}
            uiMode={uiMode}
            onClick={() => onSeatClick?.(i)}
            onExpand={(card: CardDef) => onCardExpand?.(card)}
          />
        ))}
      </div>

      {/* Hole cards */}
      <div className="flex-shrink-0 flex flex-col gap-1 justify-center">
        <p className="text-[8px] text-gray-600 font-black uppercase text-center">Hand</p>
        <div className="flex gap-0.5 flex-wrap max-w-[72px]">
          {player.holeCards.map((card: PokerCard, i: number) => (
            <div
              key={i}
              className={cn(
                "w-7 h-10 rounded border font-black text-center flex items-center justify-center text-xs flex-col bg-white shadow-sm",
                (reveal || !isOpponent) ? SUIT_COLOR[card.suit] : "bg-gray-800 border-gray-700"
              )}
              style={{ color: (reveal || !isOpponent) ? ((card.suit === 'H' || card.suit === 'D') ? '#f87171' : '#0f172a') : '#374151' }}
            >
              {(reveal || !isOpponent) ? (
                <>
                  <span className="text-[8px] leading-none">{rankToString(card.rank)}</span>
                  <span className="text-[10px]">{suitSymbol(card.suit)}</span>
                </>
              ) : <span className="text-gray-600">?</span>}
            </div>
          ))}
        </div>
        <p className="text-[8px] text-gray-600 text-center">{player.hand.length} cards</p>
      </div>
    </div>
  );
}

// ── SEAT CARD ─────────────────────────────────────────────────────────────────
function SeatCard({ seat, seatIndex, reveal, isOpponent, state, uiMode, onClick, onExpand }: any) {
  const unit: Unit | null = seat.unit;
  const cardDef = unit ? state.cardDefs[unit.cardId] : null;
  const isPickTarget = uiMode?.kind === "pick_cast_seat" && uiMode.validSeats?.includes(seatIndex) && !isOpponent;
  const isAssTarget = uiMode?.kind === "pick_assassinate_target" && isOpponent;

  return (
    <div
      className={cn(
        "flex-1 min-w-0 aspect-[2/3] max-h-36 rounded-lg border-2 transition-all relative group cursor-pointer",
        seat.locked ? "border-gray-700 bg-gray-900/40" :
        isPickTarget ? "border-amber-400 bg-amber-900/20 animate-pulse shadow-[0_0_15px_rgba(251,191,36,0.4)]" :
        isAssTarget ? "border-rose-500 bg-rose-900/20 hover:shadow-[0_0_15px_rgba(244,63,94,0.4)]" :
        (unit && cardDef) ? RARITY_CSS[cardDef.rarity] + " bg-black/40" :
        "border-dashed border-gray-700 bg-transparent"
      )}
      onClick={onClick}
    >
      {seat.locked && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-gray-700 text-xs font-black uppercase text-center">
            <Shield className="w-4 h-4 mx-auto mb-1" /><span className="text-[8px]">Locked</span>
          </div>
        </div>
      )}

      {unit && cardDef && (
        <>
          {cardDef.image_url ? (
            <img
              src={cardDef.image_url}
              alt={cardDef.name}
              className="absolute inset-0 w-full h-full object-cover rounded-lg opacity-80 group-hover:opacity-100 transition-opacity"
            />
          ) : (
            <div className="absolute inset-0 bg-gray-900 rounded-lg flex items-center justify-center opacity-40">
              <Package className="w-8 h-8 text-gray-700" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent rounded-lg" />
          <div className="absolute bottom-0 left-0 right-0 p-1">
            <p className="text-[7px] font-black text-white uppercase leading-tight line-clamp-1">{unit.name}</p>
            <div className="flex items-center gap-1 mt-0.5 flex-wrap">
              {(unit.baseDefense + unit.bonusDefense > 0) && (
                <div className="flex items-center gap-0.5">
                  <Shield className="w-2 h-2 text-blue-400" />
                  <span className="text-[7px] text-blue-300 font-black">{unit.baseDefense + unit.bonusDefense}</span>
                </div>
              )}
              {unit.keyword && (
                <div className="flex items-center gap-0.5">
                  <Zap className="w-2 h-2 text-amber-400" />
                  <span className="text-[7px] text-amber-300 font-bold truncate">{unit.keyword}</span>
                  {unit.keywordTier && (
                    <span className="text-[6px] font-black bg-amber-500/80 text-black px-0.5 rounded">
                      {['','I','II','III'][unit.keywordTier]}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
          {/* Expand on hover */}
          <button
            className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity bg-black/70 rounded-full p-0.5"
            onClick={(e) => { e.stopPropagation(); onExpand?.(cardDef); }}
          >
            <Info className="w-3 h-3 text-white" />
          </button>
        </>
      )}

      {!unit && !seat.locked && (
        <div className="absolute inset-0 flex items-center justify-center">
          {isPickTarget ? (
            <div className="text-amber-400 text-[8px] font-black uppercase text-center">
              <Zap className="w-4 h-4 mx-auto mb-1 animate-bounce" />Cast Here
            </div>
          ) : (
            <span className="text-gray-700 text-[8px] font-black uppercase">Empty</span>
          )}
        </div>
      )}
    </div>
  );
}

// ── COMMUNITY AREA ─────────────────────────────────────────────────────────────
function CommunityArea({ state }: { state: MatchState }) {
  return (
    <div className="flex gap-2 justify-center items-center mb-2">
      {[0, 1, 2, 3, 4].map(i => {
        const card = state.community[i];
        return (
          <div
            key={i}
            className={cn(
              "w-9 h-14 rounded border-2 flex flex-col items-center justify-center font-black text-xs shadow",
              card ? "bg-white border-gray-200" : "bg-gray-800/50 border-dashed border-gray-700"
            )}
            style={{ color: card && (card.suit === 'H' || card.suit === 'D') ? '#f87171' : card ? '#0f172a' : '#374151' }}
          >
            {card ? (
              <>
                <div className="flex flex-col items-center justify-center leading-none">
                  <span className="text-xs font-black">{rankToString(card.rank)}</span>
                  <span className="text-base">{suitSymbol(card.suit)}</span>
                </div>
              </>
            ) : (
              <span className="text-gray-700 text-[8px]">{['F','F','F','T','R'][i]}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── POT DISPLAY ──────────────────────────────────────────────────────────────
function PotDisplay({ pot }: { pot: MatchState['pot'] }) {
  const total = pot.main + pot.phantom;
  if (total === 0) return null;
  return (
    <div className="flex items-center gap-2 bg-black/60 border border-amber-800/40 rounded-full px-4 py-1.5 shadow-lg">
      <Coins className="w-4 h-4 text-amber-400" />
      <span className="text-amber-300 font-black font-mono text-sm">{total.toLocaleString()}</span>
      <span className="text-amber-600/60 text-[9px] font-bold uppercase">Pot</span>
    </div>
  );
}

// ── TCG HAND SECTION ─────────────────────────────────────────────────────────
function TcgHandSection({ player, state, myActions, isMyTurn, uiMode, setUiMode, act, onExpandCard }: any) {
  if (player.hand.length === 0) return null;

  return (
    <div className="px-4 pt-3 pb-2 bg-gradient-to-t from-black/40 to-transparent">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-black uppercase text-amber-500/80 tracking-widest">Your Hand ({player.hand.length})</p>
        <span className="text-[10px] font-bold text-gray-500 bg-white/5 px-2 py-0.5 rounded-full">TCG Cards</span>
      </div>
      <div className="flex gap-4 overflow-x-auto pb-4 px-2 no-scrollbar scroll-smooth">
        {player.hand.map((cardId: string) => {
          const def: CardDef = state.cardDefs[cardId];
          if (!def) return null;

          const canCast = isMyTurn && myActions.some((a: any) => a.type === 'cast' && a.cardId === cardId);
          
          return (
            <motion.div
              key={cardId}
              className="flex-shrink-0 w-32 relative group"
              whileHover={{ y: -16, scale: 1.1, zIndex: 10 }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div
                className={cn(
                  "w-full aspect-[2/3] rounded-xl overflow-hidden border-2 cursor-pointer relative shadow-2xl transition-all duration-300",
                  canCast ? "border-amber-400 ring-2 ring-amber-400/20" : "border-gray-700 opacity-80"
                )}
                onClick={() => onExpandCard?.(def)}
              >
                {def.image_url ? (
                  <img src={def.image_url} alt={def.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gray-900 flex items-center justify-center">
                    <Package className="w-8 h-8 text-gray-700" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
                
                {/* Rarity Glow */}
                <div className={cn(
                  "absolute inset-x-0 bottom-0 h-1",
                  def.rarity === 'Divine' ? "bg-red-500 shadow-[0_0_10px_red]" :
                  def.rarity === 'Mythic' ? "bg-yellow-500 shadow-[0_0_10px_yellow]" :
                  def.rarity === 'Rare' ? "bg-blue-500" : "bg-gray-500"
                )} />

                <div className="absolute bottom-0 inset-x-0 p-2">
                  <p className="text-[9px] font-black text-white uppercase line-clamp-2 leading-tight tracking-tight drop-shadow-md">{def.name}</p>
                  <div className="flex items-center justify-between mt-1">
                    <div className="flex items-center gap-1">
                      <Coins className="w-2.5 h-2.5 text-yellow-400" />
                      <span className="text-[10px] text-yellow-300 font-black font-mono">{def.cast_cost}</span>
                    </div>
                    {def.keyword && (
                      <span className="text-[8px] font-black text-amber-900 bg-amber-400 px-1 rounded-sm leading-none py-0.5">
                        {def.keyword}
                      </span>
                    )}
                  </div>
                </div>

                {/* Cast Overlay */}
                {canCast && (
                  <div className="absolute inset-x-0 top-0 h-8 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="bg-amber-500 text-black text-[9px] font-black px-2 py-0.5 rounded-full animate-bounce">
                      READY TO CAST
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

// ── ACTION BAR ───────────────────────────────────────────────────────────────
function ActionBar({ state, myActions, isMyTurn, uiMode, setUiMode, act }: any) {
  const hasCheck = myActions.some((a: any) => a.type === 'check');
  const hasFold  = myActions.some((a: any) => a.type === 'fold');
  const callAct  = myActions.find((a: any) => a.type === 'call');
  const raiseAct = myActions.find((a: any) => a.type === 'raise');
  const igniteAct = myActions.find((a: any) => a.type === 'ignite');
  const assassinateActs = myActions.filter((a: any) => a.type === 'assassinate');

  if (!isMyTurn) {
    return (
      <div className="flex items-center justify-center gap-3 py-3">
        <div className="flex gap-1.5">
          {[0,1,2].map(i => (
            <motion.div key={i} animate={{ opacity: [0.2,1,0.2] }} transition={{ repeat: Infinity, duration: 1, delay: i*0.2 }}
              className="w-3 h-3 rounded-full bg-amber-500" />
          ))}
        </div>
        <span className="text-sm font-black uppercase tracking-widest text-gray-500 italic">Opponent thinking…</span>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap justify-center gap-2 py-3">
      {hasCheck && <ActionBtn label="Check" onClick={() => act({ type: 'check' })} variant="white" />}
      {callAct  && <ActionBtn label={`Call ${callAct.amount ?? ''}`} onClick={() => act(callAct)} variant="primary" />}
      {raiseAct && <ActionBtn label={`Raise ${raiseAct.amount}`} onClick={() => act(raiseAct)} variant="amber" />}
      {hasFold  && <ActionBtn label="Fold" onClick={() => act({ type: 'fold' })} variant="danger" />}
      {igniteAct && <ActionBtn label="Ignite" onClick={() => act(igniteAct)} variant="rose" icon={<Flame className="w-4 h-4" />} />}
      {assassinateActs.length > 0 && (
        <ActionBtn
          label="Assassinate"
          onClick={() => setUiMode({ kind: 'pick_assassinate_target', validActions: assassinateActs })}
          variant="orange"
          icon={<Skull className="w-4 h-4" />}
        />
      )}
    </div>
  );
}

function ActionBtn({ label, onClick, variant, icon }: { label: string; onClick: () => void; variant: string; icon?: React.ReactNode }) {
  const STYLES: Record<string, string> = {
    white:   'bg-white text-gray-900 hover:bg-gray-100',
    primary: 'bg-emerald-600 hover:bg-emerald-500 text-white',
    amber:   'bg-amber-500 hover:bg-amber-400 text-black',
    danger:  'bg-gray-700 hover:bg-gray-600 text-gray-200',
    rose:    'bg-rose-600 hover:bg-rose-500 text-white',
    orange:  'bg-orange-600 hover:bg-orange-500 text-white',
  };
  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={cn('px-5 py-3 rounded-xl font-black uppercase text-sm flex items-center gap-2 shadow-lg', STYLES[variant])}
    >
      {icon}{label}
    </motion.button>
  );
}
