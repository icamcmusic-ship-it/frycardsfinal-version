import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useProfileStore } from '../stores/profileStore';
import { Sword, Shield, Zap, Search, Loader2, Trophy, Ghost, Play, ArrowLeft, Star, Heart, Skull, Award } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import toast from 'react-hot-toast';
import { CardDisplay } from '../components/CardDisplay';

export function Battle() {
  const { profile, refreshProfile } = useProfileStore();
  const [decks, setDecks] = useState<any[]>([]);
  const [selectedDeckId, setSelectedDeckId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [gameState, setGameState] = useState<'selection' | 'searching' | 'battle' | 'results'>('selection');
  const [opponent, setOpponent] = useState<any>(null);
  const [battleResult, setBattleResult] = useState<any>(null);

  useEffect(() => {
    if (profile) {
      fetchDecks();
    }
  }, [profile]);

  const fetchDecks = async () => {
    try {
      const { data, error } = await supabase.rpc('get_user_decks_with_cards');
      if (error) throw error;
      const validDecks = (data || []).filter((d: any) => d.cards?.length >= 30);
      setDecks(validDecks);
      if (validDecks.length > 0) setSelectedDeckId(validDecks[0].id);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleStartSearching = () => {
    if (!selectedDeckId) {
      toast.error('Please select a valid deck first!');
      return;
    }
    setGameState('searching');
    
    // Simulate matchmaking
    setTimeout(() => {
      setOpponent({
        username: 'Master Duelist',
        level: 42,
        avatar_url: 'https://picsum.photos/seed/enemy/200',
        rank: 'Legendary'
      });
      setGameState('battle');
      
      // Auto-resolve battle after 5 seconds for simulation
      setTimeout(handleResolveBattle, 5000);
    }, 3000);
  };

  const handleResolveBattle = async () => {
    try {
      const isWin = Math.random() > 0.5;
      const { data, error } = await supabase.rpc('submit_battle_result', {
        p_deck_id: selectedDeckId,
        p_opponent_id: null, // Simulation
        p_is_win: isWin,
        p_xp_gained: isWin ? 250 : 50,
        p_gold_earned: isWin ? 100 : 25
      });
      
      if (error) throw error;
      
      setBattleResult({
        isWin,
        xp: isWin ? 250 : 50,
        gold: isWin ? 100 : 25,
        rewards: data?.rewards || []
      });
      setGameState('results');
      refreshProfile();
    } catch (err: any) {
      toast.error(err.message || 'Battle failure');
      setGameState('selection');
    }
  };

  if (loading) {
     return (
       <div className="flex items-center justify-center h-96">
         <Loader2 className="w-12 h-12 animate-spin text-red-500" />
       </div>
     );
  }

  return (
    <div className="max-w-6xl mx-auto pb-20">
      <AnimatePresence mode="wait">
        {gameState === 'selection' && (
          <motion.div 
            key="selection"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-8"
          >
            <div className="text-center space-y-4">
               <div className="w-20 h-20 bg-red-100 rounded-2xl border-4 border-red-500 flex items-center justify-center mx-auto shadow-[8px_8px_0px_0px_rgba(239,68,68,0.2)]">
                  <Sword className="w-10 h-10 text-red-500" />
               </div>
               <h1 className="text-5xl font-black uppercase tracking-tighter text-[var(--text)] italic">Enter Battle</h1>
               <p className="text-slate-500 font-bold text-lg max-w-xl mx-auto leading-relaxed">
                  Select your strongest strategy and challenge the arena. Win battles to earn XP, Gold, and rare rewards!
               </p>
            </div>

            {decks.length === 0 ? (
               <div className="bg-yellow-50 border-4 border-yellow-200 rounded-3xl p-12 text-center space-y-6 max-w-2xl mx-auto shadow-[12px_12px_0px_0px_rgba(234,179,8,0.2)]">
                  <Ghost className="w-16 h-16 text-yellow-400 mx-auto" />
                  <h2 className="text-2xl font-black uppercase text-yellow-900">No Ready Decks</h2>
                  <p className="text-yellow-700 font-bold">You need at least one deck with 30 cards to enter the battle arena.</p>
                  <button 
                    onClick={() => window.location.href = '/decks'}
                    className="px-8 py-3 bg-yellow-400 text-black font-black rounded-xl border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] uppercase"
                  >
                     Go to Deck Builder
                  </button>
               </div>
            ) : (
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {decks.map(deck => (
                     <div 
                        key={deck.id}
                        onClick={() => setSelectedDeckId(deck.id)}
                        className={cn(
                          "bg-[var(--surface)] border-4 p-6 rounded-2xl cursor-pointer transition-all transform active:scale-95",
                          selectedDeckId === deck.id 
                            ? "border-red-500 ring-4 ring-red-500/20 shadow-[12px_12px_0px_0px_rgba(239,68,68,1)] bg-red-50/50 -translate-y-2" 
                            : "border-[var(--border)] hover:border-slate-400 shadow-[8px_8px_0px_0px_var(--border)]"
                        )}
                     >
                        <div className="flex items-center justify-between mb-4">
                           <h3 className="text-2xl font-black uppercase truncate">{deck.name}</h3>
                           {selectedDeckId === deck.id && <Sword className="w-6 h-6 text-red-500" />}
                        </div>
                        <div className="grid grid-cols-5 gap-1 mb-4">
                           {deck.cards?.slice(0, 10).map((c: any, i: number) => (
                             <div key={i} className="aspect-[3/4] rounded bg-slate-200 border border-slate-300 overflow-hidden">
                                <img src={c.image_url} className="w-full h-full object-cover grayscale" />
                             </div>
                           ))}
                        </div>
                        <p className="text-xs font-black text-slate-500 uppercase tracking-widest">{deck.cards?.length} CARDS</p>
                     </div>
                  ))}
               </div>
            )}

            {decks.length > 0 && (
               <div className="flex justify-center pt-8">
                  <button 
                    onClick={handleStartSearching}
                    className="group relative px-12 py-6 bg-red-500 text-white font-black text-3xl rounded-3xl border-8 border-black shadow-[16px_16px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-y-[-4px] active:translate-y-2 active:shadow-none uppercase italic tracking-tighter"
                  >
                     <div className="absolute inset-0 bg-white/10 group-hover:bg-white/20 transition-colors pointer-events-none" />
                     <div className="flex items-center gap-4">
                        <Sword className="w-10 h-10 group-hover:rotate-12 transition-transform" />
                        FIND BATTLE
                     </div>
                  </button>
               </div>
            )}
          </motion.div>
        )}

        {gameState === 'searching' && (
          <motion.div 
            key="searching"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
            className="flex flex-col items-center justify-center h-[70vh] space-y-8"
          >
            <div className="relative">
               <div className="w-48 h-48 bg-red-500 rounded-full animate-ping opacity-20" />
               <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-32 h-32 bg-red-500 border-8 border-black rounded-full flex items-center justify-center shadow-2xl relative overflow-hidden">
                     <Search className="w-16 h-16 text-white animate-pulse" />
                     <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                  </div>
               </div>
            </div>
            <div className="text-center space-y-4">
               <h2 className="text-4xl font-black uppercase text-[var(--text)] tracking-tighter italic">Finding Opponent...</h2>
               <p className="text-slate-500 font-black uppercase tracking-widest animate-pulse">Arena Matchmaking in Progress</p>
            </div>
          </motion.div>
        )}

        {gameState === 'battle' && (
          <motion.div 
            key="battle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center h-[80vh] space-y-12"
          >
             {/* Battle Intro Visual */}
             <div className="flex items-center gap-12 sm:gap-24">
                <div className="flex flex-col items-center gap-4">
                   <div className="w-32 h-32 sm:w-48 sm:h-48 bg-blue-500 rounded-3xl border-8 border-black shadow-[12px_12px_0px_0px_rgba(59,130,246,1)] overflow-hidden transform rotate-3">
                      <img src={profile?.avatar_url || ''} className="w-full h-full object-cover" />
                   </div>
                   <div className="text-center">
                      <p className="text-2xl font-black uppercase text-[var(--text)] italic">{profile?.username}</p>
                      <p className="text-sm font-black text-blue-500 uppercase">LVL {profile?.level}</p>
                   </div>
                </div>

                <div className="relative">
                   <div className="text-6xl sm:text-8xl font-black italic text-red-500 animate-bounce">VS</div>
                </div>

                <div className="flex flex-col items-center gap-4">
                   <div className="w-32 h-32 sm:w-48 sm:h-48 bg-red-500 rounded-3xl border-8 border-black shadow-[-12px_12px_0px_0px_rgba(239,68,68,1)] overflow-hidden transform -rotate-3">
                      <img src={opponent?.avatar_url} className="w-full h-full object-cover" />
                   </div>
                   <div className="text-center">
                      <p className="text-2xl font-black uppercase text-[var(--text)] italic">{opponent?.username}</p>
                      <p className="text-sm font-black text-red-500 uppercase">{opponent?.rank}</p>
                   </div>
                </div>
             </div>

             <div className="w-full max-w-md space-y-4">
                <div className="h-4 bg-slate-200 rounded-full border-4 border-black overflow-hidden relative">
                   <div className="absolute inset-0 bg-red-500 animate-[shimmer_2s_infinite]" style={{ width: '45%' }} />
                </div>
                <div className="flex justify-between font-black uppercase text-xs text-slate-500">
                   <span>BATTLE SIMULATION</span>
                   <span className="flex items-center gap-1">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Resolving Strategies
                   </span>
                </div>
             </div>
          </motion.div>
        )}

        {gameState === 'results' && battleResult && (
          <motion.div 
            key="results"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex flex-col items-center justify-center h-[80vh] space-y-8"
          >
             <div className={cn(
               "p-12 rounded-[3rem] border-8 border-black shadow-[24px_24px_0px_0px_rgba(0,0,0,1)] text-center relative overflow-hidden max-w-lg w-full",
               battleResult.isWin ? "bg-emerald-400" : "bg-red-400"
             )}>
                <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none bg-[radial-gradient(circle_at_center,_white_1px,_transparent_1px)] bg-[size:16px_16px]" />
                
                <div className="relative z-10">
                   {battleResult.isWin ? (
                      <>
                         <Trophy className="w-32 h-32 text-yellow-100 mx-auto mb-6 drop-shadow-[4px_4px_0px_rgba(0,0,0,1)]" />
                         <h2 className="text-7xl font-black italic uppercase tracking-tighter text-black mb-4">Victory!</h2>
                      </>
                   ) : (
                      <>
                         <Skull className="w-32 h-32 text-red-900/40 mx-auto mb-6 drop-shadow-[4px_4px_0px_rgba(0,0,0,1)]" />
                         <h2 className="text-7xl font-black italic uppercase tracking-tighter text-black mb-4">Defeat</h2>
                      </>
                   )}

                   <div className="bg-black/10 backdrop-blur-sm rounded-2xl p-6 border-4 border-black/20 space-y-4">
                      <div className="flex justify-between items-center text-2xl font-black uppercase italic">
                         <span className="text-black/60">XP Gained</span>
                         <span className="text-blue-900">+{battleResult.xp}</span>
                      </div>
                      <div className="flex justify-between items-center text-2xl font-black uppercase italic">
                         <span className="text-black/60">Gold Earned</span>
                         <span className="text-yellow-900">+{battleResult.gold}</span>
                      </div>
                   </div>

                   {battleResult.rewards?.length > 0 && (
                     <div className="mt-8">
                        <p className="text-xs font-black uppercase text-black/50 tracking-widest mb-3">Bonus Loot Found</p>
                        <div className="flex justify-center gap-4">
                           {battleResult.rewards.map((r: any, i: number) => (
                             <div key={i} className="w-16 h-16 bg-white border-4 border-black rounded-xl flex items-center justify-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                                <Award className="w-8 h-8 text-purple-600" />
                             </div>
                           ))}
                        </div>
                     </div>
                   )}
                </div>
             </div>

             <button 
               onClick={() => setGameState('selection')}
               className="px-12 py-4 bg-black text-white font-black text-xl rounded-2xl border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transition-transform active:translate-y-1 active:shadow-none uppercase tracking-widest"
             >
                Return to Arena
             </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SkullIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 8v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-7-4-7 4Z" />
      <path d="M12 12v6" />
      <path d="M9 12h6" />
    </svg>
  );
}
