// src/pages/PlayPage.tsx
//
// Mode selector for Dead Man's Hand.
//
// vs CPU is fully functional today. PvP modes show a "Coming soon" notice;
// see 15_INTEGRATION_CHECKLIST.md for the server-authoritative wiring.

import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import toast from "react-hot-toast";
import { Bot, Users, Trophy, Sparkles } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuthStore } from "../stores/authStore"; 
import type { CpuDifficulty } from "../lib/dmh/cpu";

interface DeckOption {
  id: string;
  name: string;
  is_legal: boolean;
}

export default function PlayPage() {
  const nav = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [decks, setDecks] = useState<DeckOption[]>([]);
  const [chosenDeckId, setChosenDeckId] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      const { data, error } = await supabase.rpc("list_my_decks");
      if (error) toast.error(error.message);
      const legalDecks = ((data as DeckOption[]) ?? []).filter((d) => d.is_legal);
      setDecks(legalDecks);
      if (legalDecks.length > 0) setChosenDeckId(legalDecks[0].id);
      setLoading(false);
    })();
  }, []);

  async function startCpuMatch(difficulty: CpuDifficulty) {
    if (!user) return toast.error("Sign in first");
    if (!chosenDeckId) return toast.error("Build a legal deck first");

    // Fetch full deck (leader + cards) — server-side aggregator
    const { data: myDeck, error: e1 } = await supabase.rpc("get_deck", { p_deck_id: chosenDeckId });
    if (e1 || !myDeck) return toast.error("Failed to load deck");

    // Build CPU deck. For 1.0 we use the same deck for the CPU (mirror match).
    const cpuDeck = myDeck;

    nav("/play/match", {
      state: {
        p1Deck: { leader: myDeck.leader, cards: myDeck.cards },
        p2Deck: { leader: cpuDeck.leader, cards: cpuDeck.cards },
        difficulty,
        seed: Date.now() & 0xffffffff,
        user_id: user.id,
      },
    });
  }

  return (
    <div className="max-w-4xl mx-auto p-6" id="play-page">
      <h1 className="text-4xl font-bold text-amber-400 mb-2">Play</h1>
      <p className="text-gray-400 mb-6">Choose your deck, choose your stakes.</p>

      {/* Deck picker */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-6" id="deck-picker">
        <h2 className="text-lg font-bold mb-2">Active Deck</h2>
        {loading ? (
          <p className="text-gray-400" id="loading-deck-choice">Loading…</p>
        ) : decks.length === 0 ? (
          <div id="no-legal-decks">
            <p className="text-gray-400">You don't have a legal deck yet.</p>
            <button
              onClick={() => nav("/decks")}
              className="mt-2 px-4 py-2 rounded bg-amber-500 text-black font-bold"
              id="btn-goto-decks"
            >Build a Deck</button>
          </div>
        ) : (
          <select
            value={chosenDeckId}
            onChange={(e) => setChosenDeckId(e.target.value)}
            className="w-full bg-gray-950 border border-gray-800 rounded p-2 text-white"
            id="deck-select-dropdown"
          >
            {decks.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        )}
      </div>

      {/* CPU section */}
      <h2 className="text-2xl font-bold text-white mb-3 flex items-center gap-2">
        <Bot className="w-6 h-6 text-emerald-400" /> Practice vs CPU
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-8" id="cpu-modes">
        <ModeCard
          title="Easy" subtitle="Beginner-friendly"
          xp="50 XP base"
          color="emerald"
          onClick={() => void startCpuMatch("easy")}
          id="mode-easy"
        />
        <ModeCard
          title="Normal" subtitle="Pot odds + simple AI"
          xp="100 XP base"
          color="sky"
          onClick={() => void startCpuMatch("normal")}
          id="mode-normal"
        />
        <ModeCard
          title="Hard" subtitle="Bluffs, value bets, target priority"
          xp="200 XP base"
          color="rose"
          onClick={() => void startCpuMatch("hard")}
          id="mode-hard"
        />
      </div>

      {/* PvP section */}
      <h2 className="text-2xl font-bold text-white mb-3 flex items-center gap-2">
        <Users className="w-6 h-6 text-amber-400" /> Player vs Player
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3" id="pvp-modes">
        <ModeCard
          title="Casual" subtitle="Low-stakes practice match"
          xp="No rating change"
          color="indigo"
          onClick={() => toast("PvP coming soon — see roadmap.")}
          icon={<Sparkles className="w-4 h-4" />}
          id="mode-casual"
        />
        <ModeCard
          title="Ranked" subtitle="Climb the leaderboard"
          xp="Rating ±25"
          color="amber"
          onClick={() => toast("Ranked coming soon — see roadmap.")}
          icon={<Trophy className="w-4 h-4" />}
          id="mode-ranked"
        />
      </div>
    </div>
  );
}

const ModeCard: React.FC<{
  title: string;
  subtitle: string;
  xp: string;
  color: "emerald" | "sky" | "rose" | "indigo" | "amber";
  onClick: () => void;
  icon?: React.ReactNode;
  id?: string;
}> = ({
  title, subtitle, xp, color, onClick, icon, id
}) => {
  const COLORS = {
    emerald: "from-emerald-700 to-emerald-900 border-emerald-600",
    sky:     "from-sky-700 to-sky-900 border-sky-600",
    rose:    "from-rose-700 to-rose-900 border-rose-600",
    indigo:  "from-indigo-700 to-indigo-900 border-indigo-600",
    amber:   "from-amber-700 to-amber-900 border-amber-600",
  } as const;
  return (
    <motion.button
      whileHover={{ y: -4, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`text-left rounded-xl p-4 bg-gradient-to-br ${COLORS[color]} border-2`}
      id={id}
    >
      <div className="flex items-center gap-2 text-xl font-bold text-white">
        {icon}
        {title}
      </div>
      <p className="text-gray-200 text-sm mt-1">{subtitle}</p>
      <p className="text-xs text-gray-300 mt-2">{xp}</p>
    </motion.button>
  );
}
