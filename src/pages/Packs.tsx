import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useProfileStore } from '../stores/profileStore';
import { PackageOpen, Sparkles, Loader2, Coins, Gem } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

interface PackType {
  id: string;
  name: string;
  description: string;
  cost_gold: number;
  cost_gems: number;
  image_url: string;
}

export function Packs() {
  const { profile } = useProfileStore();
  const [packs, setPacks] = useState<PackType[]>([]);
  const [loading, setLoading] = useState(true);
  const [opening, setOpening] = useState(false);
  const [openedCards, setOpenedCards] = useState<any[] | null>(null);

  useEffect(() => {
    fetchPacks();
  }, []);

  const fetchPacks = async () => {
    try {
      const { data, error } = await supabase.rpc('get_available_packs');
      if (error) throw error;
      setPacks(data || []);
    } catch (err) {
      console.error('Error fetching packs:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenPack = async (packId: string, useGems: boolean) => {
    if (opening || !profile) return;
    setOpening(true);
    setOpenedCards(null);

    try {
      const { data, error } = await supabase.rpc('open_pack', {
        p_user_id: profile.id,
        p_pack_type_id: packId,
        p_use_gems: useGems
      });

      if (error) throw error;
      
      // Simulate pack opening animation delay
      setTimeout(() => {
        setOpenedCards(data.cards);
        setOpening(false);
      }, 1500);

    } catch (err: any) {
      alert(err.message || 'Failed to open pack');
      setOpening(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="space-y-8 relative">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Store</h1>
          <p className="text-slate-400 mt-1">Acquire new cards for your collection</p>
        </div>
        <div className="bg-slate-900/50 border border-white/5 rounded-xl px-4 py-2 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-purple-400" />
          <span className="text-sm font-medium text-slate-300">Pity Counter: <span className="text-white">{profile?.pity_counter || 0}/10</span></span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {packs.map((pack) => (
          <motion.div 
            key={pack.id}
            whileHover={{ y: -4 }}
            className="bg-slate-900/40 border border-white/10 rounded-3xl overflow-hidden relative group"
          >
            <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            
            <div className="aspect-[4/3] bg-slate-950 flex items-center justify-center p-8 relative">
              {/* Pack Image Placeholder */}
              <div className="w-32 h-48 bg-gradient-to-br from-indigo-600 to-purple-800 rounded-xl shadow-[0_0_30px_rgba(99,102,241,0.3)] border border-white/20 flex items-center justify-center transform group-hover:scale-105 group-hover:rotate-2 transition-all duration-300">
                <PackageOpen className="w-12 h-12 text-white/50" />
              </div>
            </div>

            <div className="p-6">
              <h3 className="text-xl font-bold text-white mb-2">{pack.name}</h3>
              <p className="text-sm text-slate-400 mb-6 line-clamp-2">{pack.description}</p>
              
              <div className="flex gap-3">
                {pack.cost_gold > 0 && (
                  <button 
                    onClick={() => handleOpenPack(pack.id, false)}
                    disabled={opening || (profile?.gold || 0) < pack.cost_gold}
                    className="flex-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-3 rounded-xl border border-white/10 transition-all flex items-center justify-center gap-2"
                  >
                    <Coins className="w-4 h-4 text-yellow-500" />
                    {pack.cost_gold}
                  </button>
                )}
                {pack.cost_gems > 0 && (
                  <button 
                    onClick={() => handleOpenPack(pack.id, true)}
                    disabled={opening || (profile?.gems || 0) < pack.cost_gems}
                    className="flex-1 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-3 rounded-xl transition-all shadow-[0_0_15px_rgba(99,102,241,0.3)] flex items-center justify-center gap-2"
                  >
                    <Gem className="w-4 h-4 text-emerald-400" />
                    {pack.cost_gems}
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Pack Opening Overlay */}
      <AnimatePresence>
        {(opening || openedCards) && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-4"
          >
            {opening ? (
              <div className="text-center">
                <motion.div
                  animate={{ 
                    scale: [1, 1.2, 1],
                    rotate: [0, 5, -5, 0]
                  }}
                  transition={{ duration: 0.5, repeat: Infinity }}
                  className="w-32 h-48 mx-auto bg-gradient-to-br from-indigo-600 to-purple-800 rounded-xl shadow-[0_0_50px_rgba(99,102,241,0.6)] border-2 border-white/30 flex items-center justify-center mb-8"
                >
                  <PackageOpen className="w-12 h-12 text-white" />
                </motion.div>
                <h2 className="text-2xl font-bold text-white animate-pulse">Opening Pack...</h2>
              </div>
            ) : (
              <div className="w-full max-w-5xl">
                <div className="text-center mb-12">
                  <h2 className="text-4xl font-bold text-white mb-4">Pack Opened!</h2>
                  <button 
                    onClick={() => setOpenedCards(null)}
                    className="px-8 py-3 bg-white/10 hover:bg-white/20 text-white rounded-full font-medium transition-colors"
                  >
                    Continue
                  </button>
                </div>
                
                <div className="flex flex-wrap justify-center gap-6">
                  {openedCards?.map((card, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 50, scale: 0.8 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ delay: i * 0.15, type: 'spring' }}
                      className={cn(
                        "w-48 aspect-[2.5/3.5] rounded-xl p-4 relative overflow-hidden flex flex-col justify-between border-2",
                        card.rarity === 'Legendary' ? 'bg-gradient-to-br from-yellow-900 to-amber-900 border-yellow-500 shadow-[0_0_30px_rgba(234,179,8,0.4)]' :
                        card.rarity === 'Epic' ? 'bg-gradient-to-br from-purple-900 to-fuchsia-900 border-purple-500 shadow-[0_0_30px_rgba(168,85,247,0.4)]' :
                        card.rarity === 'Rare' ? 'bg-gradient-to-br from-blue-900 to-cyan-900 border-blue-500 shadow-[0_0_30px_rgba(59,130,246,0.4)]' :
                        'bg-slate-800 border-slate-600'
                      )}
                    >
                      {card.is_foil && (
                        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent animate-[shimmer_2s_infinite] pointer-events-none" />
                      )}
                      
                      <div className="text-xs font-bold uppercase tracking-wider text-white/70">
                        {card.rarity}
                      </div>
                      
                      <div className="text-center">
                        <div className="w-24 h-24 mx-auto bg-black/30 rounded-full mb-4" />
                        <h3 className="font-bold text-white text-lg leading-tight">{card.name}</h3>
                      </div>
                      
                      {card.is_foil && (
                        <div className="absolute top-2 right-2">
                          <Sparkles className="w-4 h-4 text-yellow-300" />
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
