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
import { useProfileStore } from "../stores/profileStore";
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

interface KeywordFeedback {
  id: string;
  side: 'A' | 'B';
  cardName: string;
  kwName: string;
  text: string;
}

interface ActionFeedback {
  id: string;
  side: 'A' | 'B';
  label: string;
  variant: 'white' | 'success' | 'amber' | 'danger' | 'info';
}

type UiMode =
  | { kind: "default" }
  | { kind: "pick_cast_seat"; cardId: string; validSeats: number[] }
  | { kind: "pick_assassinate_target"; validActions: Extract<Action, { type: "assassinate" }>[] }
  | { kind: "pick_location"; validActions: Extract<Action, { type: "place_location" }>[] }
  | { kind: "pick_parry_response"; side: "A" | "B"; validActions: Action[] }
  | { kind: "pick_fuel_card" }
  | { kind: "pick_nomad_move"; validActions: Extract<Action, { type: "nomad_move" }>[] }
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
  
  const [phaseBannerText, setPhaseBannerText] = useState('');
  const [showPhaseBanner, setShowPhaseBanner] = useState(false);
  const [isDrumrolling, setIsDrumrolling] = useState(false);
  const [isPeeking, setIsPeeking] = useState(false);
  const prevPhaseRef = useRef<string | null>(null);
  const prevLocationId = useRef<string | null>(null);
  
  // ── KEYWORD & ACTION FEEDBACK ──
  const [keywordFeedbacks, setKeywordFeedbacks] = useState<KeywordFeedback[]>([]);
  const [actionFeedbacks, setActionFeedbacks] = useState<ActionFeedback[]>([]);
  const lastLoggedRef = useRef(0);

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
    
    const isCpuTurn = state.waitingForParry ? state.waitingForParry.side === "B" : state.activePlayer === "B";
    if (!isCpuTurn) return;
    if (cpuBusy.current) return;

    cpuBusy.current = true;
    const slot = tournament.cpuSlots[tournament.currentRound];
    
    // Longer and variable delays for CPU
    const minDelay = 1200;
    const maxDelay = 2200;
    const delay = Math.floor(Math.random() * (maxDelay - minDelay)) + minDelay;

    const t = setTimeout(() => {
      const a = chooseAction(state, "B", slot.difficulty);
      if (a) {
        handleActionFeedback("B", a);
        setState(cur => cur ? step(cur, a) : cur);
      }
      cpuBusy.current = false;
    }, delay);
    return () => clearTimeout(t);
  }, [state, initState, tournament]);

  // ── Log auto-scroll ───────────────────────────────────────────────────────
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [state?.log.length, logOpen]);

  // ── Phase Transitions & Location Feedback ────────────────────────────────
  useEffect(() => {
    if (!state) return;
    
    // Auto-trigger Location Select if it's our turn
    if (state.waitingForLocation === 'A' && uiMode.kind !== 'pick_location') {
      const locActs = listLegalActions(state, 'A').filter((a: any) => a.type === 'place_location') as Extract<Action, { type: "place_location" }>[];
      if (locActs.length > 0) {
        setUiMode({ kind: 'pick_location', validActions: locActs });
      }
    }

    // Auto-trigger Parry if it's our turn
    if (state.waitingForParry?.side === 'A' && uiMode.kind !== 'pick_parry_response') {
      const parryActs = listLegalActions(state, 'A');
      setUiMode({ kind: 'pick_parry_response', side: 'A', validActions: parryActs });
    }

    if (state.waitingForParry === null && uiMode.kind === 'pick_parry_response') {
      setUiMode({ kind: 'default' });
    }

    // Phase Banner
    if (prevPhaseRef.current !== state.phase && state.phase !== 'ended') {
      const p = state.phase;
      if (['flop', 'turn', 'river'].includes(p)) {
        setPhaseBannerText(p.toUpperCase());
        setShowPhaseBanner(true);
        setTimeout(() => setShowPhaseBanner(false), 1800);
      }
      if (p === 'showdown') {
        setPhaseBannerText("SHOWDOWN");
        setShowPhaseBanner(true);
        setIsDrumrolling(true);
        setTimeout(() => {
          setShowPhaseBanner(false);
          setIsDrumrolling(false);
        }, 2500);
      }
      prevPhaseRef.current = state.phase;
    }

    // Location Feedback
    if (state.location && state.location.cardId !== prevLocationId.current) {
      const def = state.cardDefs[state.location.cardId];
      if (def) {
        toast(`Location: ${def.name}\n${def.effect_text}`, { 
          icon: '📍', 
          duration: 4000,
          style: { background: '#1e293b', color: '#fcd34d', border: '1px solid #78350f', fontSize: '12px' }
        });
      }
      prevLocationId.current = state.location.cardId;
    }

    // Keyword Feedback logic
    if (state.log.length > lastLoggedRef.current) {
      const newLogs = state.log.slice(lastLoggedRef.current);
      lastLoggedRef.current = state.log.length;

      newLogs.forEach((entry, i) => {
        // Pattern: "[PlayerName]'s [CardName] ([Keyword]) trigger fired..."
        // or any distinctive keyword trigger message from the engine
        const match = entry.text.match(/\[(.+)\]'s (.+) \((.+)\) trigger fired/);
        if (match) {
          const [_, _pName, cardName, kwName] = match;
          const id = `kw-${Date.now()}-${i}`;
          const feedback: KeywordFeedback = {
            id,
            side: entry.side as 'A' | 'B',
            cardName,
            kwName,
            text: entry.text.split('fired: ')[1] || 'Triggered!'
          };
          setKeywordFeedbacks(prev => [...prev, feedback]);
          setTimeout(() => {
            setKeywordFeedbacks(prev => prev.filter(f => f.id !== id));
          }, 2500);
        }
      });
    }
  }, [state?.phase, state?.location?.cardId, state?.log]);

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
    }).then(({ data }) => {
      const xp = data?.xp_gained ?? (won ? 100 : 25);
      const gold = data?.gold_gained ?? 0;
      toast.success(won 
        ? `Victory! +${xp} XP  +${gold}g` 
        : `Defeated. +${xp} XP consolation`, 
        { icon: won ? "🏆" : "💀", duration: 4000 }
      );
      useProfileStore.getState().refreshProfile();
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
      const nextRound = tournament.currentRound + 1;
      const slots = tournament.cpuSlots;
      
      setTournament(prev => prev ? { 
        ...prev, 
        currentRound: nextRound, 
        wins: prev.wins + 1, 
        playerStartStash: carryStash 
      } : prev);
      
      // Brief delay then start next round
      setTimeout(() => {
        reportedRef.current = false;
        startRound(slots, nextRound, carryStash);
      }, 3500);
    } else if (won && isLastRound) {
      setTournament(prev => prev ? { ...prev, wins: prev.wins + 1, complete: true } : prev);
    }
  }, [state?.phase, state?.winner]);

  const act = useCallback((a: Action) => {
    if (!state || state.phase === "ended") return;
    handleActionFeedback("A", a);
    setState(cur => cur ? step(cur, a) : cur);
    setUiMode({ kind: "default" });
  }, [state]);

  function handleActionFeedback(side: 'A' | 'B', a: Action) {
    let label = '';
    let variant: ActionFeedback['variant'] = 'white';

    switch (a.type) {
      case 'check': label = '✓ Check'; variant = 'white'; break;
      case 'call': label = '📞 Call'; variant = 'success'; break;
      case 'raise': label = `⬆ Raise ${a.amount}`; variant = 'amber'; break;
      case 'fold': label = '✋ Fold'; variant = 'danger'; break;
      case 'cast': label = '✨ Cast'; variant = 'info'; break;
      case 'foldcast': label = '✨ Fold-Cast'; variant = 'info'; break;
      case 'assassinate': label = '💀 Assassinate'; variant = 'danger'; break;
      case 'ignite': label = '🔥 Ignite'; variant = 'danger'; break;
      case 'fuel': label = '🔥 Fuel'; variant = 'danger'; break;
      case 'buyout': label = '🗡️ Buyout'; variant = 'danger'; break;
      case 'place_location': label = '📍 Set Location'; variant = 'amber'; break;
      case 'prophet_peek': label = '👁 Prophet Peek'; variant = 'info'; break;
      case 'ultimatum': label = '👑 Ultimatum'; variant = 'danger'; break;
      case 'desperado_fold': label = '🏃 Desperado Fold'; variant = 'danger'; break;
      case 'nomad_move': label = '➡️ Nomad Move'; variant = 'info'; break;
    }

    if (label) {
      const id = `act-${Date.now()}-${Math.random()}`;
      setActionFeedbacks(prev => [...prev, { id, side, label, variant }]);
      setTimeout(() => setActionFeedbacks(prev => prev.filter(f => f.id !== id)), 2000);
    }
  }

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

      {/* ── PHASE BANNER ── */}
      <AnimatePresence>
        {showPhaseBanner && (
          <motion.div
            className="absolute inset-0 flex items-center justify-center z-[90] pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="bg-black/60 backdrop-blur-xl border-y-4 border-amber-500/50 w-full py-16 flex flex-col items-center justify-center gap-4 relative overflow-hidden">
              <motion.div 
                initial={{ width: 0 }} 
                animate={{ width: '100%' }} 
                transition={{ duration: 1.5, ease: "easeInOut" }}
                className="absolute top-0 h-1 bg-amber-500 shadow-[0_0_20px_rgba(251,191,36,0.8)]" 
              />
              <motion.div 
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="flex items-center gap-8"
              >
                <div className="h-px w-32 bg-gradient-to-r from-transparent to-amber-500/50" />
                <h2 className="text-7xl font-black italic tracking-[0.5em] text-white drop-shadow-[0_0_30px_rgba(255,255,255,0.4)]">
                  {phaseBannerText}
                </h2>
                <div className="h-px w-32 bg-gradient-to-l from-transparent to-amber-500/50" />
              </motion.div>
              <motion.div 
                initial={{ width: 0 }} 
                animate={{ width: '100%' }} 
                transition={{ duration: 1.5, ease: "easeInOut" }}
                className="absolute bottom-0 h-1 bg-amber-500 shadow-[0_0_20px_rgba(251,191,36,0.8)]" 
              />
              
              {isDrumrolling && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0, 1, 0] }}
                  transition={{ repeat: Infinity, duration: 0.2 }}
                  className="absolute inset-0 bg-white/5 pointer-events-none"
                />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* ── KEYWORD FEEDBACK OVERLAYS ── */}
      <div className="absolute inset-0 pointer-events-none z-[120]">
        <AnimatePresence>
          {keywordFeedbacks.map((f) => (
            <motion.div
              key={f.id}
              initial={{ opacity: 0, scale: 0.5, y: f.side === 'B' ? 100 : -100 }}
              animate={{ opacity: 1, scale: 1, y: f.side === 'B' ? 150 : -150 }}
              exit={{ opacity: 0, scale: 1.2, y: f.side === 'B' ? 200 : -200 }}
              className={cn(
                "absolute left-1/2 -translate-x-1/2 flex flex-col items-center gap-2",
                f.side === 'B' ? "top-0" : "bottom-0"
              )}
            >
              <div className="bg-amber-500 text-black px-4 py-2 rounded-2xl font-black shadow-[0_0_30px_rgba(251,191,36,0.6)] border-2 border-white flex items-center gap-2">
                <Zap className="w-5 h-5 animate-pulse fill-black" />
                <div className="flex flex-col leading-none">
                  <span className="text-[10px] uppercase opacity-70 tracking-tighter">{f.kwName} Triggered</span>
                  <span className="text-base uppercase tracking-tight">{f.cardName}</span>
                </div>
              </div>
              <div className="bg-black/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-amber-500/50 text-[10px] uppercase font-black text-amber-200 max-w-[200px] text-center leading-tight">
                {f.text}
              </div>
            </motion.div>
          ))}
          {actionFeedbacks.map((f) => (
            <motion.div
              key={f.id}
              initial={{ opacity: 0, y: f.side === 'B' ? 100 : -100, x: -50 }}
              animate={{ opacity: 1, y: f.side === 'B' ? 120 : -120 }}
              exit={{ opacity: 0, y: f.side === 'B' ? 150 : -150 }}
              className={cn(
                "absolute left-1/2 -translate-x-1/2 px-4 py-2 rounded-xl font-black text-lg uppercase tracking-tighter shadow-2xl skew-x-[-10deg]",
                f.variant === 'white' ? "bg-white text-black" :
                f.variant === 'success' ? "bg-emerald-500 text-black" :
                f.variant === 'amber' ? "bg-amber-500 text-black shadow-amber-500/40" :
                f.variant === 'danger' ? "bg-red-500 text-white shadow-red-500/40" :
                "bg-blue-500 text-white shadow-blue-500/40",
                f.side === 'B' ? "top-4" : "bottom-32"
              )}
            >
              {f.label}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

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
              uiMode={uiMode}
              currentSlotName={currentSlot?.name}
              onCardExpand={(card: CardDef) => setUiMode({ kind: "expand_card", card })}
              onSeatClick={(seatIdx: number) => {
                if (uiMode.kind === "pick_assassinate_target") {
                  const action = uiMode.validActions.find(a => a.seat === seatIdx);
                  if (action) {
                    act(action);
                  }
                }
              }}
            />
          </section>

          {/* ── CENTER TABLE ── */}
          <section className="flex-1 flex flex-col items-center justify-center p-4 relative min-h-0">
            {/* Tournament Track & Participants */}
            {isMultiRound && tournament && (
              <div className="absolute top-4 inset-x-0 flex flex-col items-center gap-4 pointer-events-none">
                {/* Visual Bracket Avatars */}
                <div className="flex gap-4 pointer-events-auto">
                  {tournament.cpuSlots.map((slot, i) => (
                    <div 
                      key={i} 
                      className={cn(
                        "flex flex-col items-center transition-all duration-500",
                        i < tournament.currentRound ? "opacity-30 grayscale" :
                        i === tournament.currentRound ? "scale-110 -translate-y-2" :
                        "opacity-60 hover:opacity-100"
                      )}
                    >
                      <div className={cn(
                        "w-10 h-10 rounded-full border-2 flex items-center justify-center mb-1 relative",
                        i === tournament.currentRound ? "border-amber-400 bg-amber-900/40 shadow-[0_0_15px_rgba(251,191,36,0.6)]" :
                        i < tournament.currentRound ? "border-gray-600 bg-gray-800" :
                        "border-gray-500 bg-gray-900/60"
                      )}>
                        <Users className={cn("w-5 h-5", i === tournament.currentRound ? "text-amber-400" : "text-gray-500")} />
                        {i < tournament.currentRound && (
                          <div className="absolute -top-1 -right-1 bg-red-600 rounded-full p-0.5">
                            <Skull className="w-2.5 h-2.5 text-white" />
                          </div>
                        )}
                        {i === tournament.currentRound && (
                          <div className="absolute -bottom-1 -right-1 bg-amber-500 rounded-full p-0.5">
                            <Sword className="w-2.5 h-2.5 text-black" />
                          </div>
                        )}
                      </div>
                      <span className={cn(
                        "text-[8px] font-black uppercase tracking-tighter",
                        i === tournament.currentRound ? "text-amber-400" : "text-gray-600"
                      )}>
                        {slot.name}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-2 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-amber-900/40">
                  <Trophy className="w-3 h-3 text-amber-600" />
                  <div className="flex gap-1.5">
                    {tournament.cpuSlots.map((_, i) => (
                      <div 
                        key={i} 
                        className={cn(
                          "w-2.5 h-2.5 rounded-full border transition-all duration-500",
                          i < tournament.currentRound ? "bg-amber-600 border-amber-500" :
                          i === tournament.currentRound ? "bg-white border-white animate-pulse" :
                          "bg-gray-800 border-gray-700"
                        )}
                      />
                    ))}
                  </div>
                  <span className="text-[9px] font-black text-amber-500 uppercase ml-1">Tournament Circuit</span>
                </div>
              </div>
            )}
            
            <div className="flex items-center gap-12 relative z-10 w-full justify-center">
              {/* ── ACTIVE LOCATION Mini-Card ── */}
              {state.location && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  key={state.location.cardId}
                  className="pointer-events-auto"
                >
                  <div 
                    className="w-28 aspect-[2/3] rounded-xl border-2 border-amber-500/40 bg-black/60 shadow-2xl relative overflow-hidden group cursor-help hover:border-amber-400 transition-colors"
                    onClick={() => {
                      const def = state.cardDefs[state.location!.cardId];
                      if (def) setUiMode({ kind: 'expand_card', card: def });
                    }}
                  >
                    <div className="absolute inset-x-0 top-0 h-1 bg-amber-500 animate-pulse" />
                    <div className="p-3 h-full flex flex-col justify-center text-center items-center">
                      <MapPin className="w-5 h-5 text-amber-500 mb-1" />
                      <p className="text-[10px] font-black uppercase text-amber-400 font-mono tracking-tighter">Location</p>
                      <p className="text-xs font-black text-white mt-1 leading-tight line-clamp-3">
                        {state.cardDefs[state.location.cardId]?.name}
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
              
              <div className="flex flex-col items-center">
                <CommunityArea state={state} />
                <PotDisplay pot={state.pot} state={state} winner={state.winner} />
              </div>

              {/* Just a balancer so community cards stay dead center */}
              {state.location && <div className="w-28 opacity-0 pointer-events-none" />}
            </div>
          </section>

      {/* ── PLAYER SIDE ── */}
      <section className="flex-shrink-0 p-4 border-t-2 border-amber-900/40 bg-black/40">
        <PlayerPanel
          player={me}
          side="A"
          reveal
          state={state}
          uiMode={uiMode}
          onSeatClick={(seatIdx: number) => {
            if (uiMode.kind === "pick_cast_seat" && uiMode.validSeats.includes(seatIdx)) {
              act({ type: "cast", cardId: uiMode.cardId, seat: seatIdx as 0|1|2 });
            } else if (uiMode.kind === "pick_nomad_move") {
              const action = uiMode.validActions.find(a => a.toSeat === seatIdx);
              if (action) {
                act(action);
              }
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
              ) : uiMode.kind === 'pick_parry_response' ? (
                <ParryActionBar
                  state={state}
                  myActions={myActions}
                  act={act}
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
              <div className="flex-1 overflow-y-auto p-3 space-y-1.5 text-xs no-scrollbar">
                {state.log.map((entry, i) => {
                  const isNew = i >= state.log.length - 2;
                  return (
                    <motion.div key={i} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}>
                      <div className={cn(
                        "px-2 py-1.5 rounded border text-xs leading-snug transition-all duration-500",
                        isNew && "shadow-[inset_0_0_10px_rgba(251,191,36,0.1)] border-amber-500/30",
                        entry.text.includes("wins") || entry.text.includes("Victory") ? "bg-amber-500/10 border-amber-500/40 text-amber-100" :
                        entry.text.includes("bankrupt") || entry.text.includes("Fold") ? "bg-red-500/10 border-red-500/40 text-red-200" :
                        entry.text.includes("assassinate") ? "bg-orange-500/10 border-orange-500/40 text-orange-200" :
                        entry.text.includes("trigger fired") ? "bg-amber-900/40 border-amber-500/40 text-amber-400" :
                        entry.text.includes("Location") ? "bg-blue-900/20 border-blue-500/40 text-blue-200" :
                        "bg-white/5 border-gray-700/40 text-gray-400"
                      )}>
                        <span className="text-[8px] opacity-30 font-mono mr-1.5">{entry.side ?? 'SYS'}</span>
                        {entry.text}
                      </div>
                    </motion.div>
                  );
                })}
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

      {/* ── LOCATION SELECT MODAL ── */}
      {uiMode.kind === "pick_location" && (
        <div className="fixed inset-0 bg-black/90 flex flex-col items-center justify-center z-[110] backdrop-blur-xl p-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
            <MapPin className="w-12 h-12 text-amber-500 mx-auto mb-4" />
            <h2 className="text-3xl font-black text-white uppercase tracking-tighter">Location Rotation</h2>
            <p className="text-amber-500/60 text-sm font-bold mt-1">Non-dealer chooses the next battlefield</p>
          </motion.div>
          
          <div className="flex gap-6 overflow-x-auto max-w-full pb-8 px-4">
            {uiMode.validActions.map((a: any) => {
              const def = state.cardDefs[a.cardId];
              return (
                <motion.div
                  key={a.cardId}
                  whileHover={{ scale: 1.05, y: -10 }}
                  className="flex-shrink-0 w-48 cursor-pointer flex flex-col items-center gap-4"
                  onClick={() => act(a)}
                >
                  <div className="w-full aspect-[2/3] rounded-2xl border-2 border-amber-500/40 bg-gray-900 overflow-hidden shadow-2xl relative group">
                     {def.image_url ? (
                       <img src={def.image_url} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt={def.name} />
                     ) : (
                       <div className="w-full h-full flex items-center justify-center"><MapPin className="w-12 h-12 text-gray-800" /></div>
                     )}
                     <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black to-transparent">
                       <p className="text-lg font-black text-white leading-tight uppercase">{def.name}</p>
                       <p className="text-[10px] text-amber-400 font-bold mt-1">{def.keyword} {romanize(def.keyword_tier)}</p>
                     </div>
                  </div>
                  <div className="bg-white/5 backdrop-blur-md p-3 rounded-xl border border-white/10 w-full text-xs text-gray-400 line-clamp-3 italic">
                    {def.effect_text}
                  </div>
                </motion.div>
              );
            })}
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="flex-shrink-0 w-48 h-[288px] rounded-2xl border-2 border-dashed border-gray-700 flex flex-col items-center justify-center gap-4 cursor-pointer hover:border-white/20 transition-colors"
              onClick={() => act({ type: 'pass' })}
            >
              <RotateCcw className="w-12 h-12 text-gray-800" />
              <span className="text-sm font-black text-gray-500 uppercase">Skip Rotation</span>
            </motion.div>
          </div>
        </div>
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
  const [isPeeking, setIsPeeking] = useState(false);

  return (
    <div className={cn("flex gap-3 items-start max-w-2xl mx-auto w-full", isOpponent ? "flex-row" : "flex-row-reverse")}>
      {/* Leader + Stats */}
      <div className="flex-shrink-0 flex flex-col items-center gap-2 w-28">
        {/* Leader card */}
        <div
          className={cn(
            "w-20 h-28 relative cursor-pointer group rounded-xl transition-all duration-500",
            player.leaderIgnited ? "ring-4 ring-orange-500 ring-offset-2 ring-offset-black shadow-[0_0_30px_rgba(249,115,22,0.6)]" : "border-2 border-amber-500/40"
          )}
          onClick={() => leaderDef && onCardExpand?.(leaderDef)}
        >
          {leaderDef?.image_url ? (
            <img src={leaderDef.image_url} alt={leaderDef.name} className="w-full h-full object-cover rounded-lg" />
          ) : (
            <div className="w-full h-full bg-amber-900/40 rounded-lg flex items-center justify-center">
              <Crown className="w-8 h-8 text-amber-400" />
            </div>
          )}
          
          {/* Ignite Overlay */}
          {player.leaderIgnited && (
            <div className="absolute inset-0 bg-gradient-to-t from-orange-600/40 via-transparent to-transparent pointer-events-none rounded-lg overflow-hidden">
               <motion.div animate={{ y: [0, -10, 0], opacity: [0.3, 0.6, 0.3] }} transition={{ repeat: Infinity, duration: 1.5 }} className="h-full w-full bg-[url('https://www.transparenttextures.com/patterns/fire.png')] opacity-20" />
            </div>
          )}

          {/* Badge */}
          <div className="absolute -top-2 -left-2 bg-black border border-amber-500 text-amber-400 px-1.5 py-0.5 rounded text-[8px] font-black uppercase shadow-xl z-10">
            {leaderDef?.keyword || 'Leader'}
          </div>

          <div className="absolute inset-0 bg-black/60 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <Info className="w-5 h-5 text-white" />
          </div>
        </div>

        {/* Fuel pips */}
        {leaderDef?.keyword === 'Fuel' && (
          <div className="flex gap-1.5 bg-black/40 px-2 py-1 rounded-full border border-orange-500/30">
            {[0,1,2].map(i => (
              <motion.div 
                key={i} 
                animate={i < player.leaderFuel ? { scale: [1, 1.2, 1], rotate: [0, 10, 0] } : {}}
                className={cn("w-2.5 h-2.5 rounded-full border shadow-sm", i < player.leaderFuel ? "bg-orange-500 border-orange-400 shadow-orange-500/50" : "bg-gray-800 border-gray-700")} 
              />
            ))}
          </div>
        )}

        {/* Stash */}
        <div className="bg-black/80 border border-amber-900/60 rounded-xl px-3 py-1.5 text-center w-full shadow-inner relative overflow-hidden">
          <p className="text-[8px] text-amber-500/40 font-black uppercase tracking-tighter">Liquid Stash</p>
          <div className="flex items-center justify-center gap-1">
             <Coins className="w-3 h-3 text-amber-500" />
             <motion.span 
               key={player.stash}
               initial={{ scale: 1.2, color: '#fbbf24' }}
               animate={{ scale: 1, color: '#fcd34d' }}
               className="text-amber-300 font-black font-mono text-base leading-none"
             >
               {player.stash.toLocaleString()}
             </motion.span>
          </div>
          <AnimatePresence>
             {player.stash !== (player.prevStash ?? player.stash) && (
               <motion.div
                 initial={{ y: 0, opacity: 0 }}
                 animate={{ y: -20, opacity: 1 }}
                 exit={{ y: -40, opacity: 0 }}
                 className={cn(
                   "absolute top-0 right-2 text-[10px] font-black",
                   player.stash > player.prevStash ? "text-emerald-400" : "text-red-400"
                 )}
               >
                 {player.stash > player.prevStash ? '+' : ''}{player.stash - (player.prevStash ?? player.stash)}
               </motion.div>
             )}
          </AnimatePresence>
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
      <div className="flex-shrink-0 flex flex-col gap-1.5 justify-center mr-2">
        <p className="text-[9px] text-gray-500 font-black uppercase text-center tracking-tighter">Hole Cards</p>
        <div className="flex gap-1.5 flex-wrap justify-center max-w-[120px]">
          {player.holeCards.map((card: PokerCard, i: number) => {
            const isVisible = reveal || (!isOpponent && isPeeking);
            return (
              <motion.div
                key={i}
                onMouseEnter={() => !isOpponent && setIsPeeking(true)}
                onMouseLeave={() => !isOpponent && setIsPeeking(false)}
                onClick={() => !isOpponent && setIsPeeking(!isPeeking)}
                whileHover={isVisible ? { scale: 1.1, y: -5 } : {}}
                whileTap={isVisible ? { scale: 0.95 } : {}}
                initial={false}
                animate={{ rotateY: isVisible ? 0 : 180 }}
                transition={{ type: "spring", damping: 15, stiffness: 200, delay: i * 0.1 }}
                style={{ transformStyle: 'preserve-3d' }}
                className={cn(
                  "w-12 h-16 rounded-lg border-2 font-black flex flex-col items-center justify-center relative cursor-pointer shadow-lg transition-colors",
                  isVisible ? "bg-white border-gray-100" : "bg-emerald-950 border-emerald-900 shadow-inner"
                )}
              >
                {/* Front */}
                <div 
                  className={cn("absolute inset-0 flex flex-col items-center justify-center", !isVisible && "hidden")}
                  style={{ color: (card.suit === 'H' || card.suit === 'D') ? '#f87171' : '#0f172a' }}
                >
                  <span className="text-sm leading-tight font-black">{rankToString(card.rank)}</span>
                  <span className="text-xl leading-none">{suitSymbol(card.suit)}</span>
                </div>
                {/* Back */}
                <div 
                  className={cn("absolute inset-0 flex items-center justify-center bg-emerald-900 rounded-lg", isVisible && "hidden")}
                  style={{ transform: 'rotateY(180deg)', backfaceVisibility: 'hidden' }}
                >
                   <Crown className="w-5 h-5 text-emerald-700/50" />
                </div>
              </motion.div>
            );
          })}
        </div>
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
  const isNomadTarget = uiMode?.kind === "pick_nomad_move" && uiMode.validActions.some((a: any) => a.toSeat === seatIndex) && !isOpponent;

  return (
    <div
      className={cn(
        "flex-1 min-w-0 aspect-[2/3] max-h-[400px] rounded-xl border-2 transition-all relative group cursor-pointer overflow-hidden",
        seat.locked ? "border-red-900/40 bg-red-950/20 grayscale" :
        (isPickTarget || isNomadTarget) ? "border-amber-400 bg-amber-900/30 animate-pulse shadow-[0_0_30px_rgba(251,191,36,0.6)] scale-[1.02] z-10" :
        isAssTarget ? "border-rose-500 bg-rose-900/30 hover:shadow-[0_0_20px_rgba(244,63,94,0.4)]" :
        unit && unit.exhausted ? "border-gray-800 bg-gray-900 opacity-60" :
        (unit && cardDef) ? RARITY_CSS[cardDef.rarity] + " bg-black/40 shadow-xl" :
        "border-dashed border-white/10 bg-white/[0.03]"
      )}
      onClick={onClick}
    >
      {seat.locked && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-950/40 backdrop-blur-[1px]">
          <Lock className="w-6 h-6 text-red-500 mb-1 opacity-60" />
          <span className="text-[8px] font-black uppercase text-red-400 tracking-widest">Locked Slot</span>
        </div>
      )}

      {unit && cardDef && (
        <>
          <div className={cn("absolute inset-0", unit.exhausted && "grayscale brightness-50")}>
            {cardDef.image_url ? (
              <img
                src={cardDef.image_url}
                alt={cardDef.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              />
            ) : (
              <div className="w-full h-full bg-gray-900 flex items-center justify-center">
                <Package className="w-8 h-8 text-gray-800" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
          </div>

          {unit.exhausted && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
               <Ghost className="w-8 h-8 text-white/10" />
            </div>
          )}

          <div className="absolute bottom-0 left-0 right-0 p-1.5">
            <p className="text-[8px] font-black text-white uppercase leading-tight line-clamp-1 mb-0.5 tracking-tight">{unit.name}</p>
            <div className="flex items-center gap-1 flex-wrap">
              {(unit.baseDefense + unit.bonusDefense > 0) && (
                <div className="flex items-center gap-0.5 bg-blue-950/60 px-1 rounded shadow-sm">
                  <Shield className="w-2.5 h-2.5 text-blue-400" />
                  <span className="text-[8px] text-blue-300 font-black">{unit.baseDefense + unit.bonusDefense}</span>
                </div>
              )}
              {unit.keyword && (
                <div className="flex items-center gap-0.5 bg-amber-950/60 px-1 rounded-sm shadow-sm border border-amber-500/20">
                  <Zap className="w-2.5 h-2.5 text-amber-500" />
                  <span className="text-[7px] text-amber-300 font-black uppercase tracking-tighter truncate max-w-[40px]">{unit.keyword}</span>
                  {unit.keywordTier && (
                    <span className="text-[6px] font-black text-amber-500">
                      {romanize(unit.keywordTier)}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Expanded Action hint */}
          {isPickTarget && (
            <div className="absolute inset-0 flex items-center justify-center bg-amber-400/20 backdrop-blur-[1px]">
               <div className="bg-amber-400 text-black px-3 py-1 rounded-full font-black text-[9px] uppercase tracking-widest shadow-xl animate-bounce">
                 Cast Here
               </div>
            </div>
          )}
        </>
      )}

      {!unit && !seat.locked && (
        <div className="absolute inset-0 flex items-center justify-center">
          {isPickTarget ? (
            <div className="text-amber-400 text-[8px] font-black uppercase text-center">
              <Zap className="w-6 h-6 mx-auto mb-1 animate-bounce" />Cast Here
            </div>
          ) : (
            <div className="flex flex-col items-center opacity-20">
               <div className="w-8 h-8 rounded-full border-2 border-dashed border-white/40 flex items-center justify-center mb-1">
                  <span className="text-lg font-bold">+</span>
               </div>
               <span className="text-white/40 text-[8px] font-black uppercase tracking-widest">Empty Seat</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── COMMUNITY AREA ─────────────────────────────────────────────────────────────
function CommunityArea({ state }: { state: MatchState }) {
  return (
    <div className="flex gap-3 justify-center items-center mb-4">
      {[0, 1, 2, 3, 4].map(i => {
        const card = state.community[i];
        return (
          <motion.div
            key={i}
            initial={false}
            animate={card ? { 
              rotateY: 0, 
              scale: 1,
              x: [0, -2, 2, -2, 2, 0],
            } : { 
              rotateY: 180, 
              scale: 0.95,
              x: 0
            }}
            transition={{ 
              type: "spring", 
              damping: 12, 
              stiffness: 100, 
              delay: card ? i * 0.35 : 0, // only stagger when appearing
              x: { duration: 0.4, delay: i * 0.35 }
            }}
            className={cn(
              "w-14 h-20 rounded border-2 flex flex-col items-center justify-center font-black text-sm shadow preserve-3d transition-colors",
              card ? "bg-white border-gray-200" : "bg-gray-800/50 border-dashed border-gray-700"
            )}
            style={{ 
              color: card && (card.suit === 'H' || card.suit === 'D') ? '#f87171' : card ? '#0f172a' : '#374151',
              transformStyle: 'preserve-3d'
            }}
          >
            {card ? (
              <div className="flex flex-col items-center justify-center leading-none pointer-events-none">
                <span className="text-xl font-black">{rankToString(card.rank)}</span>
                <span className="text-3xl">{suitSymbol(card.suit)}</span>
              </div>
            ) : (
              <span className="text-gray-700 text-[10px]">{['F','F','F','T','R'][i]}</span>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}

// ── POT DISPLAY ──────────────────────────────────────────────────────────────
function PotDisplay({ pot, state, winner }: { pot: MatchState['pot'], state: MatchState, winner: string | null }) {
  const total = pot.main + pot.phantom;
  if (total === 0) return null;
  
  const isEnded = state.phase === 'ended';
  
  return (
    <motion.div 
      initial={{ scale: 0.8, opacity: 0 }}
      animate={isEnded ? { 
        y: winner === 'A' ? 200 : -200, 
        scale: 0.5, 
        opacity: 0,
        transition: { delay: 0.5, duration: 1, ease: "circIn" }
      } : { scale: 1, opacity: 1 }}
      className="flex items-center gap-2 bg-black/60 border border-amber-800/40 rounded-full px-4 py-1.5 shadow-lg relative"
    >
      <Coins className="w-4 h-4 text-amber-400" />
      <motion.span 
        key={total}
        initial={{ scale: 1.2, color: '#fbbf24' }}
        animate={{ scale: 1, color: '#fcd34d' }}
        className="text-amber-300 font-black font-mono text-sm"
      >
        {total.toLocaleString()}
      </motion.span>
      <span className="text-amber-600/60 text-[9px] font-bold uppercase">Pot</span>
      
      {isEnded && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] font-black text-amber-500 uppercase whitespace-nowrap"
        >
          Transferring Pot...
        </motion.div>
      )}
    </motion.div>
  );
}

// ── TCG HAND SECTION ─────────────────────────────────────────────────────────
function TcgHandSection({ player, state, myActions, isMyTurn, uiMode, setUiMode, act, onExpandCard }: any) {
  if (player.hand.length === 0) return null;

  return (
    <div className="px-4 py-4 bg-gradient-to-t from-black/60 to-transparent">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
           <BookOpen className="w-4 h-4 text-amber-500" />
           <p className="text-sm font-black uppercase text-amber-500 tracking-widest leading-none">Your Hand</p>
        </div>
        <span className="text-[10px] font-black text-gray-500 bg-white/5 px-3 py-1 rounded-full uppercase">{player.hand.length} Cards</span>
      </div>
      <div className="flex gap-6 overflow-x-auto pb-4 px-2 no-scrollbar scroll-smooth">
        {player.hand.map((cardId: string) => {
          const def: CardDef = state.cardDefs[cardId];
          if (!def) return null;

          const castAction = myActions.find((a: any) => a.type === 'cast' && a.cardId === cardId);
          const canCast = !!castAction && isMyTurn;
          
          const foldCastAction = myActions.find((a: any) => a.type === 'foldcast' && a.cardId === cardId);
          const canFoldCast = !!foldCastAction && isMyTurn;

          const fuelAction = myActions.find((a: any) => a.type === 'fuel' && a.payload.kind === 'discard' && a.payload.cardId === cardId);
          const canFuel = !!fuelAction && isMyTurn;

          return (
            <motion.div
              key={cardId}
              className="flex-shrink-0 w-36 sm:w-40 lg:w-44 relative group"
              whileHover={{ y: -16, scale: 1.05, zIndex: 10 }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div
                className={cn(
                  "w-full aspect-[2/3] rounded-2xl overflow-hidden border-2 cursor-pointer relative shadow-2xl transition-all duration-300",
                  canCast || canFoldCast || canFuel ? "border-emerald-400 ring-2 ring-emerald-400/20 shadow-[0_0_30px_rgba(16,185,129,0.3)]" : "border-gray-800 opacity-80"
                )}
                onClick={() => onExpandCard?.(def)}
              >
                {(canCast || canFoldCast || canFuel) && (
                  <div className="absolute inset-0 bg-emerald-400/5 animate-pulse pointer-events-none" />
                )}
                {def.image_url ? (
                  <img src={def.image_url} alt={def.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gray-900 flex items-center justify-center">
                    <Package className="w-10 h-10 text-gray-700" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
                
                {/* Rarity Indicator */}
                <div className={cn(
                  "absolute inset-x-0 bottom-0 h-1",
                  def.rarity === 'Divine' ? "bg-red-500 shadow-[0_0_10px_red]" :
                  def.rarity === 'Mythic' ? "bg-yellow-500 shadow-[0_0_10px_yellow]" :
                  def.rarity === 'Rare' ? "bg-blue-500" : "bg-gray-600"
                )} />

                {/* Header info */}
                <div className="absolute top-2 left-2 right-2 flex justify-between items-start">
                   <div className="bg-black/60 backdrop-blur-md px-1.5 py-0.5 rounded border border-white/10">
                      <p className="text-[10px] font-black text-white font-mono leading-none">{def.cast_cost}</p>
                   </div>
                </div>

                <div className="absolute bottom-0 inset-x-0 p-3 bg-gradient-to-t from-black to-transparent">
                  <p className="text-[11px] font-black text-white uppercase line-clamp-1 leading-tight tracking-tight drop-shadow-md mb-1">{def.name}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <Coins className="w-3 h-3 text-yellow-400" />
                      <span className="text-[11px] text-yellow-300 font-black font-mono leading-none">{def.cast_cost}</span>
                    </div>
                    {def.keyword && (
                      <span className="text-[9px] font-black text-amber-900 bg-amber-400 px-1.5 rounded-sm filter drop-shadow-sm">
                        {def.keyword}
                      </span>
                    )}
                  </div>
                </div>

                {/* ACTIONS */}
                {(canCast || canFoldCast || canFuel) && (
                  <div className="absolute inset-x-0 bottom-4 flex flex-col gap-2 items-center px-4 z-20">
                    {canCast && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          if (def.card_type === 'Unit') {
                            const validSeats = myActions
                              .filter((a: any) => a.type === 'cast' && a.cardId === cardId)
                              .map((a: any) => a.seat);
                            setUiMode({ kind: 'pick_cast_seat', cardId, validSeats });
                          } else {
                            act(castAction!);
                          }
                        }}
                        className="w-full bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-black py-2.5 rounded-xl shadow-[0_0_30px_rgba(16,185,129,0.5)] transform active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer z-50 pointer-events-auto"
                      >
                        <Zap className="w-4 h-4 fill-black" />
                        CAST
                      </button>
                    )}
                    {canFoldCast && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          act(foldCastAction!);
                        }}
                        className="w-full bg-rose-500 hover:bg-rose-400 text-white text-xs font-black py-2.5 rounded-xl shadow-[0_0_30px_rgba(225,29,72,0.5)] transform active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer z-50 pointer-events-auto"
                      >
                        <Zap className="w-4 h-4" />
                        FOLD-CAST
                      </button>
                    )}
                    {canFuel && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          act(fuelAction!);
                        }}
                        className="w-full bg-orange-500 hover:bg-orange-400 text-black text-xs font-black py-2.5 rounded-xl shadow-[0_0_30px_rgba(249,115,22,0.5)] transform active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer z-50 pointer-events-auto"
                      >
                        <Flame className="w-4 h-4 fill-black" />
                        FUEL
                      </button>
                    )}
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

// ── PARRY ACTION BAR ───────────────────────────────────────────────────────
function ParryActionBar({ state, myActions, act }: any) {
  const parryAct = myActions.find((a: any) => a.type === 'parry');
  const passAct  = myActions.find((a: any) => a.type === 'parryPass');
  
  if (!parryAct && !passAct) return null;

  return (
    <motion.div 
      initial={{ y: 50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="flex flex-col items-center gap-4 py-8 bg-slate-900 border border-rose-500/30 rounded-3xl mx-4 mb-4 shadow-[0_0_50px_rgba(225,29,72,0.2)]"
    >
      <div className="flex flex-col items-center gap-1">
        <div className="flex items-center gap-2">
           <Zap className="w-5 h-5 text-rose-500 animate-pulse fill-rose-500" />
           <h3 className="text-xl font-black text-white uppercase tracking-tighter italic">REACTION PHASE</h3>
        </div>
        <p className="text-gray-400 text-xs font-black uppercase tracking-widest leading-none">The opponent is casting an Event!</p>
      </div>
      
      <div className="flex gap-4">
        {parryAct && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => act(parryAct)}
            className="px-10 py-4 bg-rose-600 hover:bg-rose-500 text-white rounded-2xl font-black uppercase text-lg shadow-[0_0_30px_rgba(225,29,72,0.4)] flex items-center gap-3 transition-colors"
          >
            <Shield className="w-6 h-6 fill-white" />
            PARRY
          </motion.button>
        )}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => act(passAct)}
          className="px-10 py-4 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-2xl font-black uppercase text-lg transition-colors"
        >
          IGNORE
        </motion.button>
      </div>
    </motion.div>
  );
}

// ── ACTION BAR ───────────────────────────────────────────────────────────────
function ActionBar({ state, myActions, isMyTurn, uiMode, setUiMode, act }: any) {
  const checkAct = myActions.find((a: any) => a.type === 'check');
  const foldAct  = myActions.find((a: any) => a.type === 'fold');
  const callAct  = myActions.find((a: any) => a.type === 'call');
  const raiseActs = myActions.filter((a: any) => a.type === 'raise');
  const igniteAct = myActions.find((a: any) => a.type === 'ignite');
  const assassinateActs = myActions.filter((a: any) => a.type === 'assassinate');
  const prophetAct = myActions.find((a: any) => a.type === 'prophet_peek');
  const ultimatumAct = myActions.find((a: any) => a.type === 'ultimatum');
  const desperadoAct = myActions.find((a: any) => a.type === 'desperado_fold');
  const nomadActs = myActions.filter((a: any) => a.type === 'nomad_move');

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

  const myStash = state.players.A.stash;
  const owed = state.players.B.currentBet - state.players.A.currentBet;
  const callAmount = Math.min(myStash, owed);
  const isAllInCall = callAmount === myStash && myStash > 0;

  return (
    <div className="flex flex-wrap justify-center gap-2 py-3">
      {checkAct && <ActionBtn label="Check" onClick={() => act(checkAct)} variant="white" />}
      {callAct  && <ActionBtn label={isAllInCall ? `CALL ALL IN (${callAmount})` : `Call ${callAmount}`} onClick={() => act(callAct)} variant="primary" />}
      {raiseActs.map((rAct: any, i: number) => {
        let label = '';
        if (rAct.amount === myStash && myStash > 0) label = `ALL IN (${rAct.amount})`;
        else if (i === 0) label = `Min Raise ${rAct.amount}`;
        else if (i === 1) label = `Pot Raise ${rAct.amount}`;
        else label = `Raise ${rAct.amount}`;
        
        return (
          <ActionBtn 
            key={i} 
            label={label} 
            onClick={() => act(rAct)} 
            variant={rAct.amount === myStash ? "rose" : "amber"} 
          />
        );
      })}
      {foldAct  && <ActionBtn label="Fold" onClick={() => act(foldAct)} variant="danger" />}
      {desperadoAct && <ActionBtn label="Desperado Fold" onClick={() => act(desperadoAct)} variant="danger" icon={<Skull className="w-4 h-4" />} />}
      {igniteAct && <ActionBtn label="Ignite" onClick={() => act(igniteAct)} variant="rose" icon={<Flame className="w-4 h-4" />} />}
      {prophetAct && <ActionBtn label="Prophet: Peek" onClick={() => act(prophetAct)} variant="orange" icon={<BookOpen className="w-4 h-4" />} />}
      {ultimatumAct && <ActionBtn label="Ultimatum" onClick={() => act(ultimatumAct)} variant="rose" icon={<Crown className="w-4 h-4" />} />}
      {nomadActs.length > 0 && (
        <ActionBtn
          label="Nomad Move"
          onClick={() => setUiMode({ kind: 'pick_nomad_move', validActions: nomadActs })}
          variant="info"
          icon={<ArrowRight className="w-4 h-4" />}
        />
      )}
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

function ActionBtn({ label, onClick, variant, icon }: { label: string; onClick: () => void; variant: string; icon?: React.ReactNode; key?: React.Key }) {
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
