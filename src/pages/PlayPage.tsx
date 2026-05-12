// src/pages/PlayPage.tsx
// Updated: configuration screen for 1–4 CPU opponents (5 total players).
// Multi-CPU matches run as a sequential tournament: defeat each CPU to advance.

import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import toast from "react-hot-toast";
import { Bot, Users, Trophy, Sparkles, Loader2, Crown, ChevronRight, ChevronLeft, Plus, Minus, Skull, Star, Zap } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuthStore } from "../stores/authStore";
import { cn } from "../lib/utils";
import type { CpuDifficulty } from "../lib/dmh/cpu";
import type { CardDef } from "../lib/dmh/types";

interface DeckOption {
  id: string;
  name: string;
  is_legal: boolean;
  leader_id: string | null;
  leader_name: string | null;
  leader_image: string | null;
}

interface CpuSlot {
  enabled: boolean;
  difficulty: CpuDifficulty;
  name: string;
}

const CPU_NAMES = ['The Dealer', 'The Shark', 'The Ghost', 'The House'];
const DIFFICULTY_CONFIG: Record<CpuDifficulty, { label: string; color: string; bg: string; desc: string; xp: number; xp_loss: number }> = {
  easy:   { label: 'Easy',   color: 'text-emerald-400', bg: 'bg-emerald-900/30 border-emerald-700', desc: 'Beginner-friendly',            xp: 150, xp_loss: 75  },
  normal: { label: 'Normal', color: 'text-sky-400',     bg: 'bg-sky-900/30 border-sky-700',         desc: 'Pot odds + basic AI',          xp: 200, xp_loss: 125 },
  hard:   { label: 'Hard',   color: 'text-rose-400',    bg: 'bg-rose-900/30 border-rose-700',       desc: 'Bluffs, value bets, priority', xp: 300, xp_loss: 225 },
};

type Step = 'deck' | 'opponents' | 'ready';

export default function PlayPage() {
  const nav = useNavigate();
  const user = useAuthStore((s) => s.user);

  const [decks, setDecks] = useState<DeckOption[]>([]);
  const [chosenDeckId, setChosenDeckId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<Step>('deck');

  // CPU slots: up to 4 (total 5 players)
  const [cpuSlots, setCpuSlots] = useState<CpuSlot[]>([
    { enabled: true,  difficulty: 'normal', name: CPU_NAMES[0] },
    { enabled: false, difficulty: 'normal', name: CPU_NAMES[1] },
    { enabled: false, difficulty: 'hard',   name: CPU_NAMES[2] },
    { enabled: false, difficulty: 'hard',   name: CPU_NAMES[3] },
  ]);

  const enabledCpus = cpuSlots.filter(s => s.enabled);

  useEffect(() => {
    void (async () => {
      try { await supabase.rpc("regen_energy"); } catch {}
      const { data, error } = await supabase.rpc("list_my_decks");
      if (error) toast.error(error.message);
      const all = (data as DeckOption[]) ?? [];
      setDecks(all);
      const first = all.find(d => d.is_legal) ?? all[0];
      if (first) setChosenDeckId(first.id);
      setLoading(false);
    })();
  }, []);

  const toggleSlot = (i: number) => {
    setCpuSlots(prev => prev.map((s, idx) =>
      idx === i ? { ...s, enabled: !s.enabled } : s
    ));
  };

  const setDifficulty = (i: number, d: CpuDifficulty) => {
    setCpuSlots(prev => prev.map((s, idx) => idx === i ? { ...s, difficulty: d } : s));
  };

  async function startMatch() {
    if (!user) return toast.error("Sign in first");
    if (!chosenDeckId) return toast.error("Select a deck first");
    const currentDeck = decks.find(d => d.id === chosenDeckId);
    if (currentDeck && !currentDeck.is_legal) {
      return toast.error("This deck isn't legal — check the Deck Builder.");
    }
    if (enabledCpus.length === 0) return toast.error("Enable at least one CPU opponent.");

    setLoading(true);
    const { error: consumeErr } = await supabase.rpc("consume_energy", { p_amount: 1 });
    if (consumeErr) {
      setLoading(false);
      return toast.error("Not enough energy! Wait for it to regenerate.");
    }

    const { data: myDeck, error } = await supabase.rpc("get_deck", { p_deck_id: chosenDeckId });
    if (error || !myDeck) {
      setLoading(false);
      return toast.error("Failed to load deck data");
    }

    const p1CardDefs: CardDef[] = [myDeck.leader, ...(myDeck.cards ?? [])].filter(Boolean);
    let p2CardDefs: CardDef[] = [];
    let p2DeckData: any = null;

    try {
      // 1. Try to find potential CPU decks (non-user decks if RLS allows, or decks with 'CPU' in name)
      const { data: potentialDecks } = await supabase
        .from('decks')
        .select('id')
        .ilike('name', '%CPU%')
        .limit(3);

      if (potentialDecks && potentialDecks.length > 0) {
        const randomDeck = potentialDecks[Math.floor(Math.random() * potentialDecks.length)];
        const { data: cpuDeck } = await supabase.rpc("get_deck", { p_deck_id: randomDeck.id });
        if (cpuDeck && cpuDeck.leader && cpuDeck.cards) {
          p2DeckData = { leader: cpuDeck.leader, cards: cpuDeck.cards };
          p2CardDefs = [cpuDeck.leader, ...cpuDeck.cards].filter(Boolean);
        }
      }

      // 2. Fallback: Generate a random legal-ish deck from all cards if possible
      if (!p2DeckData) {
        const { data: allCards } = await supabase.from('cards').select('*');
        if (allCards && allCards.length > 20) {
          const leaders = allCards.filter(c => c.card_type === 'Leader');
          const locations = allCards.filter(c => c.card_type === 'Location');
          const mainPool = allCards.filter(c => c.card_type !== 'Leader' && c.card_type !== 'Location');

          const l = leaders[Math.floor(Math.random() * leaders.length)] || leaders[0];
          const loc = locations[Math.floor(Math.random() * locations.length)] || locations[0];
          
          const selection: any[] = [loc];
          while (selection.length < 19) {
            const rc = mainPool[Math.floor(Math.random() * mainPool.length)];
            const inCount = selection.filter(x => x.id === rc.id).length;
            if (inCount < (rc.rarity === 'Divine' ? 1 : 2)) {
              selection.push(rc);
            }
          }
          p2DeckData = { leader: l, cards: selection };
          p2CardDefs = [l, ...selection].filter(Boolean);
        }
      }
    } catch (e) {
      console.warn("Failed to build custom CPU deck", e);
    }

    // Ultimate fallback if everything failed: mirror player (original behavior)
    if (!p2DeckData) {
      p2DeckData = { leader: myDeck.leader, cards: myDeck.cards ?? [] };
      p2CardDefs = p1CardDefs;
    }

    // For multi-CPU: pass the full cpu configuration, GameBoard handles tournament flow
    nav("/play/match", {
      state: {
        deckId: chosenDeckId,
        deckName: currentDeck?.name,
        p1Deck: { leader: myDeck.leader, cards: myDeck.cards ?? [] },
        p2Deck: p2DeckData,
        p1CardDefs,
        p2CardDefs,
        difficulty: enabledCpus[0].difficulty,     // first CPU difficulty (primary)
        cpuSlots: enabledCpus.map(c => ({ name: c.name, difficulty: c.difficulty })),
        seed: Date.now() & 0xffffffff,
        user_id: user.id,
      },
    });
  }

  const chosenDeck = decks.find(d => d.id === chosenDeckId);
  const totalXp = enabledCpus.reduce((acc, c) => acc + DIFFICULTY_CONFIG[c.difficulty].xp, 0) + (enabledCpus.length > 1 ? enabledCpus.length * 50 : 0);

  return (
    <div className="max-w-3xl mx-auto p-6 pb-24" id="play-page">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-amber-400 mb-1 uppercase tracking-tight">Play</h1>
        <p className="text-gray-400 font-medium">Configure your match, then deal in.</p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-8">
        {(['deck', 'opponents', 'ready'] as Step[]).map((s, i) => (
          <React.Fragment key={s}>
            <button
              onClick={() => { if (s !== 'deck' || step !== 'deck') {} }}
              className={cn(
                'px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all border-2',
                step === s
                  ? 'bg-amber-500 text-black border-amber-400'
                  : i < (['deck','opponents','ready'] as Step[]).indexOf(step)
                  ? 'bg-gray-700 border-gray-600 text-gray-300'
                  : 'bg-gray-900 border-gray-800 text-gray-600'
              )}
            >
              {i + 1}. {s === 'deck' ? 'Deck' : s === 'opponents' ? 'Opponents' : 'Ready'}
            </button>
            {i < 2 && <ChevronRight className="w-4 h-4 text-gray-700" />}
          </React.Fragment>
        ))}
      </div>

      <AnimatePresence mode="wait">

        {/* ── STEP 1: DECK SELECTION ── */}
        {step === 'deck' && (
          <motion.div key="deck" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-6 shadow-2xl">
              <h2 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-4">Choose Your Arsenal</h2>

              {loading ? (
                <div className="flex items-center gap-3 text-gray-400 py-4">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Syncing deck data...</span>
                </div>
              ) : decks.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-gray-400 mb-4">No decks found. Build one to play!</p>
                  <button onClick={() => nav("/decks")} className="px-6 py-3 rounded-xl bg-amber-500 text-black font-black uppercase">
                    Go to Deck Builder
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Deck list */}
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
                    <p className="text-[10px] font-black uppercase text-amber-500/70">Select Deck</p>
                    {decks.map(d => (
                      <button
                        key={d.id}
                        onClick={() => setChosenDeckId(d.id)}
                        className={cn(
                          "w-full p-4 rounded-xl border-2 text-left transition-all",
                          d.id === chosenDeckId
                            ? "border-amber-500 bg-amber-900/20"
                            : "border-gray-800 bg-black/40 hover:border-gray-600",
                          !d.is_legal && "opacity-60"
                        )}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="font-bold text-white block">{d.name}</span>
                            {d.leader_name && <span className="text-gray-500 text-[10px] uppercase font-black">{d.leader_name}</span>}
                          </div>
                          <span className={cn(
                            "text-[10px] font-black uppercase px-2 py-0.5 rounded",
                            d.is_legal ? "bg-emerald-900/50 text-emerald-400" : "bg-red-900/50 text-red-400"
                          )}>
                            {d.is_legal ? "Legal" : "Invalid"}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>

                  {/* Leader preview */}
                  {chosenDeck && (
                    <div className="bg-black/40 border-2 border-amber-900/30 rounded-xl p-4 flex gap-4 items-center">
                      <div className="w-16 h-16 rounded-full bg-amber-900/20 border-2 border-amber-500 overflow-hidden flex-shrink-0">
                        {chosenDeck.leader_image ? (
                          <img src={chosenDeck.leader_image} alt="Leader" className="w-full h-full object-cover" />
                        ) : <Crown className="w-8 h-8 text-amber-500 m-auto" />}
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase text-amber-500/70">Leader</p>
                        <p className="text-lg font-black text-white uppercase tracking-tight">{chosenDeck.leader_name || 'Unknown'}</p>
                        <p className="text-[10px] font-bold text-gray-500 italic">"The cards are dealt, the stakes are set."</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <button
              onClick={() => setStep('opponents')}
              disabled={!chosenDeckId || !decks.find(d => d.id === chosenDeckId)?.is_legal}
              className="w-full py-4 bg-amber-500 hover:bg-amber-400 text-black font-black uppercase tracking-widest rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              Choose Opponents <ChevronRight className="w-5 h-5" />
            </button>
          </motion.div>
        )}

        {/* ── STEP 2: OPPONENT CONFIGURATION ── */}
        {step === 'opponents' && (
          <motion.div key="opponents" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-6 shadow-2xl">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-xs font-black text-gray-500 uppercase tracking-widest">Configure Opponents</h2>
                <span className="text-[10px] font-black text-amber-400 bg-amber-900/30 px-2 py-1 rounded-full">
                  {enabledCpus.length} / 4 CPU{enabledCpus.length !== 1 ? 's' : ''}
                </span>
              </div>
              <p className="text-gray-500 text-xs mb-6">
                {enabledCpus.length > 1
                  ? `Tournament Mode: defeat each CPU sequentially. Win bonus: +50 XP per CPU conquered.`
                  : 'Single match mode. Enable more CPUs for a tournament challenge.'}
              </p>

              {/* Visual table layout */}
              <div className="relative flex flex-col items-center mb-6">
                {/* You */}
                <div className="flex items-center gap-2 bg-amber-900/20 border-2 border-amber-600 rounded-xl px-4 py-2 mb-4 self-start">
                  <div className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center font-black text-black text-sm">YOU</div>
                  <div>
                    <p className="text-xs font-black text-amber-300">You (Human)</p>
                    <p className="text-[10px] text-amber-500/60">{chosenDeck?.leader_name || 'Selected Deck'}</p>
                  </div>
                </div>

                {/* CPU slots */}
                <div className="w-full space-y-3">
                  {cpuSlots.map((slot, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className={cn(
                        'rounded-xl border-2 transition-all overflow-hidden',
                        slot.enabled
                          ? 'border-gray-700 bg-gray-800/60'
                          : 'border-gray-800/50 bg-gray-900/40 opacity-60'
                      )}
                    >
                      <div className="flex items-center gap-3 p-3">
                        {/* Toggle */}
                        <button
                          onClick={() => toggleSlot(i)}
                          className={cn(
                            'w-9 h-9 rounded-full border-2 flex items-center justify-center transition-all flex-shrink-0',
                            slot.enabled
                              ? 'bg-rose-700 border-rose-600 text-white'
                              : 'bg-gray-800 border-gray-700 text-gray-600 hover:border-gray-600'
                          )}
                        >
                          {slot.enabled ? <Skull className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                        </button>

                        {/* Name */}
                        <div className="flex-1">
                          <p className="text-sm font-black text-white">{slot.name}</p>
                          <p className="text-[10px] text-gray-500">
                            {slot.enabled ? `Round ${i + 1} opponent` : 'Click to add opponent'}
                          </p>
                        </div>

                        {/* Difficulty selector (only when enabled) */}
                        {slot.enabled && (
                          <div className="flex gap-1">
                            {(['easy', 'normal', 'hard'] as CpuDifficulty[]).map(d => {
                              const cfg = DIFFICULTY_CONFIG[d];
                              return (
                                <button
                                  key={d}
                                  onClick={() => setDifficulty(i, d)}
                                  className={cn(
                                    'px-2 py-1 rounded-lg text-[9px] font-black uppercase border transition-all',
                                    slot.difficulty === d
                                      ? `${cfg.bg} ${cfg.color}`
                                      : 'border-gray-700 text-gray-600 hover:border-gray-600'
                                  )}
                                >
                                  {cfg.label}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Difficulty details when enabled */}
                      {slot.enabled && (
                        <div className={cn('px-3 pb-3 flex items-center justify-between')}>
                          <p className="text-[10px] text-gray-500">{DIFFICULTY_CONFIG[slot.difficulty].desc}</p>
                          <span className="text-[10px] font-black text-amber-400">Win: +{DIFFICULTY_CONFIG[slot.difficulty].xp} XP / Loss: +{DIFFICULTY_CONFIG[slot.difficulty].xp_loss} XP</span>
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* XP preview */}
              <div className="bg-black/40 border border-amber-900/30 rounded-xl p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Star className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-black text-gray-400">Potential XP (if you win all)</span>
                </div>
                <span className="text-amber-400 font-black">{totalXp} XP</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep('deck')} className="px-6 py-4 bg-gray-800 hover:bg-gray-700 text-white font-black uppercase rounded-xl flex items-center gap-2">
                <ChevronLeft className="w-4 h-4" /> Back
              </button>
              <button
                onClick={() => setStep('ready')}
                disabled={enabledCpus.length === 0}
                className="flex-1 py-4 bg-amber-500 hover:bg-amber-400 text-black font-black uppercase tracking-widest rounded-xl transition-all disabled:opacity-40 flex items-center justify-center gap-2"
              >
                Review & Start <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        )}

        {/* ── STEP 3: READY SCREEN ── */}
        {step === 'ready' && (
          <motion.div key="ready" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 mb-6 shadow-2xl text-center">
              <div className="w-20 h-20 bg-amber-500/20 border-2 border-amber-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trophy className="w-10 h-10 text-amber-400" />
              </div>
              <h2 className="text-2xl font-black text-white uppercase mb-1">Ready to Deal?</h2>
              <p className="text-gray-500 text-sm mb-6">
                {enabledCpus.length > 1 ? `Tournament: ${enabledCpus.length + 1} players · ${enabledCpus.length} rounds` : 'Single match · 2 players'}
              </p>

              {/* Match summary */}
              <div className="bg-black/40 rounded-xl p-4 text-left space-y-2 mb-6">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500 font-bold">Your Deck</span>
                  <span className="text-white font-black">{chosenDeck?.name}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500 font-bold">Opponents</span>
                  <span className="text-white font-black">{enabledCpus.length} CPU{enabledCpus.length !== 1 ? 's' : ''}</span>
                </div>
                {enabledCpus.map((c, i) => (
                  <div key={i} className="flex items-center justify-between text-xs pl-4">
                    <span className="text-gray-600">Round {i + 1}: {c.name}</span>
                    <span className={DIFFICULTY_CONFIG[c.difficulty].color + ' font-black uppercase'}>{c.difficulty}</span>
                  </div>
                ))}
                <div className="flex items-center justify-between text-sm border-t border-white/10 pt-2 mt-2">
                  <span className="text-gray-500 font-bold">Potential XP</span>
                  <span className="text-amber-400 font-black">{totalXp} XP</span>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep('opponents')} className="px-6 py-4 bg-gray-800 hover:bg-gray-700 text-white font-black uppercase rounded-xl flex items-center gap-2">
                <ChevronLeft className="w-4 h-4" /> Back
              </button>
              <motion.button
                onClick={startMatch}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="flex-1 py-4 bg-gradient-to-r from-amber-500 to-rose-500 text-black font-black uppercase tracking-widest rounded-xl shadow-[0_4px_20px_rgba(245,158,11,0.4)] text-lg"
              >
                🃏 Deal In
              </motion.button>
            </div>

            {/* PvP teaser */}
            <div className="mt-6 p-4 bg-indigo-950/40 border border-indigo-800/40 rounded-xl flex items-center gap-3">
              <Users className="w-5 h-5 text-indigo-400 flex-shrink-0" />
              <div>
                <p className="text-sm font-black text-indigo-300">PvP Ranked & Casual — Coming Soon</p>
                <p className="text-[10px] text-indigo-500">Challenge real players and climb the ELO leaderboard.</p>
              </div>
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
