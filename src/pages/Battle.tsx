import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useProfileStore } from '../stores/profileStore';
import { Loader2, Sword, Shield, Zap, Trophy, Play, ChevronRight, AlertCircle, LayoutGrid } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import toast from 'react-hot-toast';
import { cn } from '../lib/utils';

import { Link } from 'react-router-dom';

interface Deck {
  id: string;
  name: string;
  card_count: number;
  is_valid: boolean;
}

export function Battle() {
  const { profile } = useProfileStore();
  const [decks, setDecks] = useState<Deck[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDeckId, setSelectedDeckId] = useState<string | null>(null);
  const [isBattling, setIsBattling] = useState(false);
  const [battleResult, setBattleResult] = useState<any>(null);
  const [battleLog, setBattleLog] = useState<string[]>([]);

  useEffect(() => {
    if (profile) {
      fetchDecks();
    }
  }, [profile]);

  const fetchDecks = async () => {
    try {
      const { data, error } = await supabase.rpc('get_user_decks_with_cards');
      if (error) throw error;
      setDecks(data || []);
      if (data && data.length > 0) {
        const validDeck = data.find((d: any) => d.is_valid);
        if (validDeck) setSelectedDeckId(validDeck.id);
      }
    } catch (err) {
      console.error('Error fetching decks:', err);
    } finally {
      setLoading(false);
    }
  };

  const startBattle = async () => {
    if (!selectedDeckId) return;
    
    setIsBattling(true);
    setBattleResult(null);
    setBattleLog(['Searching for opponent...', 'Opponent found: AI Challenger', 'Battle starting!']);

    try {
      // Simulate some battle steps for visual effect
      await new Promise(resolve => setTimeout(resolve, 1000));
      setBattleLog(prev => [...prev, 'Drawing initial cards...']);
      await new Promise(resolve => setTimeout(resolve, 1000));
      setBattleLog(prev => [...prev, 'Round 1: Trading blows...']);
      await new Promise(resolve => setTimeout(resolve, 1000));
      setBattleLog(prev => [...prev, 'Round 2: Special abilities activated!']);
      await new Promise(resolve => setTimeout(resolve, 1000));
      setBattleLog(prev => [...prev, 'Final Round: Determining winner...']);

      // REPLACE with:
      const isWin = Math.random() < 0.55; // or your actual logic
      const xpEarned = isWin ? 75 : 25;
      const goldEarned = isWin ? 200 : 50;

      const { data, error } = await supabase.rpc('submit_battle_result', {
        p_deck_id: selectedDeckId,
        p_opponent_type: 'pve',
        p_result: isWin ? 'win' : 'loss',
        p_xp_earned: xpEarned,
        p_gold_earned: goldEarned,
        p_rounds_played: 5,
        p_battle_log: JSON.stringify(battleLog),
      });

      if (error) throw error;

      // Refresh profile to update energy/gold/xp BEFORE setting result
      await useProfileStore.getState().refreshProfile();
      
      setBattleResult(data);

      if (data.is_win) {
        toast.success('Victory!', { icon: '🏆' });
      } else {
        toast.error('Defeat...', { icon: '💀' });
      }
    } catch (err: any) {
      toast.error(err.message || 'Battle failed');
      setIsBattling(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-full"><Loader2 className="w-10 h-10 animate-spin text-blue-500" /></div>;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-4xl font-black text-[var(--text)] uppercase tracking-tight flex items-center gap-3">
          <Sword className="w-10 h-10 text-red-500" />
          Battle Arena
        </h1>
      </div>

      {!isBattling && !battleResult && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-8"
        >
          {/* Deck Selection */}
          <div className="bg-[var(--surface)] border-4 border-[var(--border)] rounded-2xl p-6 shadow-[8px_8px_0px_0px_var(--border)]">
            <h2 className="text-xl font-black text-[var(--text)] uppercase mb-4 flex items-center gap-2">
              <Shield className="w-6 h-6 text-blue-500" />
              Select Your Deck
            </h2>
            
            <div className="space-y-3">
              {decks.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-slate-500 font-bold mb-4">You need a deck to battle!</p>
                  <Link to="/decks" className="px-4 py-2 bg-blue-500 text-white font-black rounded-xl border-2 border-black">Create Deck</Link>
                </div>
              ) : (
                decks.map((deck) => (
                  <button
                    key={deck.id}
                    onClick={() => deck.is_valid && setSelectedDeckId(deck.id)}
                    disabled={!deck.is_valid}
                    className={cn(
                      "w-full p-4 rounded-xl border-4 transition-all flex items-center justify-between group",
                      selectedDeckId === deck.id 
                        ? "bg-blue-50 border-blue-500 shadow-[4px_4px_0px_0px_rgba(59,130,246,1)]" 
                        : "bg-white border-[var(--border)] hover:border-slate-400 opacity-60 grayscale-[0.5]",
                      deck.is_valid && "opacity-100 grayscale-0"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center border-2 border-black",
                        selectedDeckId === deck.id ? "bg-blue-500 text-white" : "bg-slate-100 text-slate-400"
                      )}>
                        <LayoutGrid className="w-6 h-6" />
                      </div>
                      <div className="text-left">
                        <p className="font-black text-[var(--text)] uppercase">{deck.name}</p>
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-bold text-slate-500">{deck.card_count} Cards</p>
                          <div className="flex -space-x-2">
                            {(deck as any).cards?.slice(0, 3).map((card: any, i: number) => (
                              <div key={i} className="w-6 h-8 rounded border border-black bg-gray-200 overflow-hidden shrink-0">
                                <img src={card.image_url} alt={card.name} className="w-full h-full object-cover" />
                              </div>
                            ))}
                            {(deck as any).cards?.length > 3 && (
                              <div className="w-6 h-8 rounded border border-black bg-gray-100 flex items-center justify-center font-black text-[8px] shrink-0 z-10">
                                +{(deck as any).cards.length - 3}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    {!deck.is_valid && (
                      <div className="flex items-center gap-1 text-red-500 text-[10px] font-black uppercase">
                        <AlertCircle className="w-3 h-3" />
                        Invalid
                      </div>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Battle Info */}
          <div className="bg-[var(--surface)] border-4 border-[var(--border)] rounded-2xl p-6 shadow-[8px_8px_0px_0px_var(--border)] flex flex-col justify-between">
            <div>
              <h2 className="text-xl font-black text-[var(--text)] uppercase mb-4 flex items-center gap-2">
                <Zap className="w-6 h-6 text-yellow-500" />
                Battle Details
              </h2>
              <div className="space-y-4 text-slate-600 font-bold">
                <p>• Battle against AI to earn XP and Gold.</p>
                <p>• Winning grants higher rewards.</p>
                <p>• Daily missions often require battles.</p>
                <div className="p-4 bg-yellow-50 border-2 border-yellow-200 rounded-xl text-yellow-800 text-sm">
                  <p className="flex items-center gap-2">
                    <Zap className="w-4 h-4" />
                    Costs 5 Energy per battle
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={startBattle}
              disabled={!selectedDeckId || (profile?.energy ?? 0) < 5}
              className={cn(
                "w-full mt-8 py-4 bg-red-500 text-white font-black text-2xl rounded-2xl border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all active:translate-y-1 active:shadow-none flex items-center justify-center gap-3",
                (!selectedDeckId || (profile?.energy ?? 0) < 5) && "opacity-50 cursor-not-allowed grayscale"
              )}
            >
              <Play className="w-8 h-8 fill-current" />
              START BATTLE
            </button>
          </div>
        </motion.div>
      )}

      {/* Battle Simulation UI */}
      <AnimatePresence>
        {isBattling && !battleResult && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
          >
            <div className="max-w-lg w-full space-y-8 text-center">
              <div className="relative">
                <div className="absolute inset-0 animate-ping bg-red-500/20 rounded-full blur-3xl" />
                <Sword className="w-24 h-24 text-red-500 mx-auto relative animate-bounce" />
              </div>
              <h2 className="text-4xl font-black text-white uppercase italic tracking-widest">BATTLE IN PROGRESS</h2>
              
              <div className="bg-white/10 border-2 border-white/20 rounded-2xl p-6 h-64 overflow-y-auto text-left font-mono text-sm space-y-2 scrollbar-hide">
                {battleLog.map((log, i) => (
                  <motion.p 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    key={i} 
                    className="text-green-400"
                  >
                    <span className="text-white/40 mr-2">[{new Date().toLocaleTimeString([], { hour12: false })}]</span>
                    {log}
                  </motion.p>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Battle Result UI */}
      {battleResult && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-[var(--surface)] border-8 border-[var(--border)] rounded-3xl p-8 md:p-12 shadow-[12px_12px_0px_0px_var(--border)] text-center relative overflow-hidden"
        >
          {battleResult.is_win && <div className="absolute inset-0 bg-yellow-400/10 animate-pulse" />}
          
          <div className="relative z-10">
            <div className={cn(
              "w-24 h-24 rounded-full mx-auto mb-6 flex items-center justify-center border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]",
              battleResult.is_win ? "bg-yellow-400" : "bg-slate-400"
            )}>
              {battleResult.is_win ? <Trophy className="w-12 h-12 text-black" /> : <Shield className="w-12 h-12 text-black" />}
            </div>

            <h2 className={cn(
              "text-6xl font-black uppercase mb-2 italic tracking-tighter",
              battleResult.is_win ? "text-yellow-500" : "text-slate-500"
            )}>
              {battleResult.is_win ? 'VICTORY' : 'DEFEAT'}
            </h2>
            <p className="text-xl font-bold text-slate-600 mb-8 uppercase">Battle concluded against AI Challenger</p>

            <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto mb-12">
              <div className="bg-yellow-50 border-4 border-yellow-200 p-4 rounded-2xl">
                <p className="text-xs font-black text-yellow-600 uppercase">Gold</p>
                <p className="text-2xl font-black text-yellow-700">+{battleResult.gold_earned || 0}</p>
              </div>
              <div className="bg-blue-50 border-4 border-blue-200 p-4 rounded-2xl">
                <p className="text-xs font-black text-blue-600 uppercase">XP</p>
                <p className="text-2xl font-black text-blue-700">+{battleResult.xp_earned || 0}</p>
              </div>
            </div>

            <button 
              onClick={() => { setBattleResult(null); setIsBattling(false); }}
              className="px-12 py-4 bg-black text-white font-black text-xl rounded-2xl border-4 border-black hover:bg-gray-800 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,0.3)] active:translate-y-1 active:shadow-none"
            >
              CONTINUE
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
