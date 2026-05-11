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
import { Bot, Users, Trophy, Sparkles, Loader2, Crown } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuthStore } from "../stores/authStore"; 
import type { CpuDifficulty } from "../lib/dmh/cpu";
import type { CardDef } from "../lib/dmh/types";

interface DeckOption {
  id: string;
  name: string;
  is_legal: boolean;
  leader?: {
    id: string;
    name: string;
    image_url: string | null;
  };
}

export default function PlayPage() {
  const nav = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [decks, setDecks] = useState<DeckOption[]>([]);
  const [chosenDeckId, setChosenDeckId] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      // Refresh energy first
      try {
        await supabase.rpc("regen_energy");
      } catch (err) {
        console.error("Energy regen failed:", err);
      }

      const { data, error } = await supabase.rpc("list_my_decks");
      if (error) toast.error(error.message);
      const rawDecks = (data as any[]) ?? [];
      
      // Enhance decks with leader info if missing
      const enhancedDecks = await Promise.all(rawDecks.map(async (d) => {
        try {
          const { data: detail } = await supabase.rpc("get_deck", { p_deck_id: d.id });
          return { ...d, leader: (detail as any)?.leader };
        } catch (e) {
          return d;
        }
      }));

      setDecks(enhancedDecks);
      if (enhancedDecks.length > 0) setChosenDeckId(enhancedDecks[0].id);
      setLoading(false);
    })();
  }, []);

  async function startCpuMatch(difficulty: CpuDifficulty) {
    if (!user) return toast.error("Sign in first");
    if (!chosenDeckId) return toast.error("Select a deck first");

    const currentDeck = decks.find(d => d.id === chosenDeckId);
    if (currentDeck && !currentDeck.is_legal) {
      return toast.error("This deck is not legal for tournament play. Please fix it in the Deck Builder.");
    }

    const { data: myDeck, error: e1 } = await supabase.rpc("get_deck", {
      p_deck_id: chosenDeckId
    });
    if (e1 || !myDeck) return toast.error("Failed to load deck data");

    // Build CardDef arrays from the deck objects
    const p1CardDefs: CardDef[] = [myDeck.leader, ...(myDeck.cards ?? [])].filter(Boolean);
    // CPU mirrors player deck for now (see QOL note below)
    const p2CardDefs: CardDef[] = p1CardDefs;

    nav("/play/match", {
      state: {
        deckId: chosenDeckId,        // ← CRITICAL: real deck UUID (not card ID)
        p1Deck: {
          leader: myDeck.leader,
          cards: myDeck.cards ?? [],
        },
        p2Deck: {
          leader: myDeck.leader,     // Mirror match for now
          cards: myDeck.cards ?? [],
        },
        p1CardDefs,
        p2CardDefs,
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
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-8 shadow-2xl" id="deck-picker">
        <h2 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-4">Choose Your Arsenal</h2>
        {loading ? (
          <div className="flex items-center gap-3 text-gray-400 py-4" id="loading-deck-choice">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Syncing deck data...</span>
          </div>
        ) : decks.length === 0 ? (
          <div id="no-legal-decks" className="text-center py-6">
            <p className="text-gray-400 mb-4 font-medium">You don't have a legal deck yet.</p>
            <button
              onClick={() => nav("/decks")}
              className="px-6 py-3 rounded-xl bg-amber-500 text-black font-black uppercase tracking-widest hover:bg-amber-400 transition-all shadow-[0_4px_15px_rgba(251,191,36,0.3)]"
              id="btn-goto-decks"
            >Forge a Deck</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div className="space-y-2">
                <p className="text-[10px] font-black uppercase text-amber-500/70">Select Deck</p>
                <select
                  value={chosenDeckId}
                  onChange={(e) => setChosenDeckId(e.target.value)}
                  className="w-full bg-black border-2 border-gray-800 rounded-xl p-4 text-white font-bold focus:border-amber-500 outline-none transition-colors cursor-pointer"
                  id="deck-select-dropdown"
                >
                  {decks.map((d) => (
                    <option key={d.id} value={d.id}>{d.name} ({d.is_legal ? 'Legal' : 'Invalid'})</option>
                  ))}
                </select>
             </div>

             {/* Selected Deck Preview */}
             {decks.find(d => d.id === chosenDeckId) && (
               <div className="bg-black/40 border-2 border-amber-900/30 rounded-xl p-4 flex gap-4 items-center animate-in fade-in slide-in-from-right-4 duration-500">
                  <div className="w-16 h-16 rounded-full bg-amber-900/20 border-2 border-amber-500 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {decks.find(d => d.id === chosenDeckId)?.leader?.image_url ? (
                      <img src={decks.find(d => d.id === chosenDeckId)!.leader!.image_url!} alt="Leader" className="w-full h-full object-cover" />
                    ) : (
                      <Crown className="w-8 h-8 text-amber-500" />
                    )}
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase text-amber-500/70">Leader</p>
                    <p className="text-lg font-black text-white uppercase tracking-tight">{decks.find(d => d.id === chosenDeckId)?.leader?.name || 'Unknown'}</p>
                    <p className="text-[10px] font-bold text-gray-500 italic">"The cards are dealt, the stakes are set."</p>
                  </div>
               </div>
             )}
          </div>
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
