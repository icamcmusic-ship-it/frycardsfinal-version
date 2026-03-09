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
        <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-8 relative">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-black tracking-tight uppercase">Store</h1>
          <p className="text-slate-600 font-bold mt-1">Acquire new cards for your collection</p>
        </div>
        <div className="bg-white border-4 border-black rounded-xl px-4 py-2 flex items-center gap-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transform rotate-1">
          <Sparkles className="w-5 h-5 text-purple-500 fill-purple-500" />
          <span className="text-sm font-bold text-slate-600">Pity Counter: <span className="text-black font-black">{profile?.pity_counter || 0}/10</span></span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {packs.map((pack) => (
          <motion.div 
            key={pack.id}
            whileHover={{ y: -4, rotate: -1 }}
            className="bg-white border-4 border-black rounded-2xl overflow-hidden relative group shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col"
          >
            <div className="aspect-[4/3] bg-blue-100 flex items-center justify-center p-8 relative border-b-4 border-black">
              {/* Pack Image Placeholder */}
              <div className="w-32 h-48 bg-red-500 rounded-xl border-4 border-black flex items-center justify-center transform group-hover:scale-105 group-hover:rotate-3 transition-all duration-300 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <PackageOpen className="w-16 h-16 text-white" />
              </div>
            </div>

            <div className="p-6 flex flex-col flex-1">
              <h3 className="text-2xl font-black text-black mb-2 uppercase">{pack.name}</h3>
              <p className="text-sm text-slate-600 font-bold mb-6 line-clamp-2 flex-1">{pack.description}</p>
              
              <div className="flex gap-3 mt-auto">
                {pack.cost_gold > 0 && (
                  <button 
                    onClick={() => handleOpenPack(pack.id, false)}
                    disabled={opening || (profile?.gold_balance || 0) < pack.cost_gold}
                    className="flex-1 bg-yellow-400 hover:bg-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed text-black font-black py-3 rounded-xl border-4 border-black transition-transform active:translate-y-1 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center gap-2"
                  >
                    <Coins className="w-5 h-5 text-yellow-700" />
                    {pack.cost_gold}
                  </button>
                )}
                {pack.cost_gems > 0 && (
                  <button 
                    onClick={() => handleOpenPack(pack.id, true)}
                    disabled={opening || (profile?.gem_balance || 0) < pack.cost_gems}
                    className="flex-1 bg-emerald-400 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-black font-black py-3 rounded-xl border-4 border-black transition-transform active:translate-y-1 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center gap-2"
                  >
                    <Gem className="w-5 h-5 text-emerald-700" />
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
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          >
            {opening ? (
              <div className="text-center">
                <motion.div
                  animate={{ 
                    scale: [1, 1.2, 1],
                    rotate: [0, 5, -5, 0]
                  }}
                  transition={{ duration: 0.5, repeat: Infinity }}
                  className="w-40 h-56 mx-auto bg-red-500 rounded-xl border-4 border-white flex items-center justify-center mb-8 shadow-[0_0_50px_rgba(239,68,68,0.8)]"
                >
                  <PackageOpen className="w-16 h-16 text-white" />
                </motion.div>
                <h2 className="text-4xl font-black text-white uppercase tracking-widest animate-pulse">Opening...</h2>
              </div>
            ) : (
              <div className="w-full max-w-5xl">
                <div className="text-center mb-12">
                  <h2 className="text-5xl font-black text-white mb-6 uppercase drop-shadow-[4px_4px_0px_rgba(239,68,68,1)]">Pack Opened!</h2>
                  <button 
                    onClick={() => setOpenedCards(null)}
                    className="px-8 py-4 bg-yellow-400 hover:bg-yellow-500 text-black border-4 border-black rounded-xl font-black text-xl transition-transform active:translate-y-1 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                  >
                    Awesome!
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
                        "w-48 aspect-[2.5/3.5] rounded-xl p-4 relative overflow-hidden flex flex-col justify-between border-4 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] bg-white",
                        card.rarity === 'Divine' ? 'border-yellow-400 bg-yellow-50' :
                        card.rarity === 'Mythic' ? 'border-purple-500 bg-purple-50' :
                        card.rarity === 'Rare' ? 'border-blue-500 bg-blue-50' :
                        'border-black'
                      )}
                    >
                      {card.is_foil && (
                        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/60 to-transparent animate-[shimmer_2s_infinite] pointer-events-none z-20" />
                      )}
                      
                      <div className="text-xs font-black uppercase tracking-wider text-black bg-white border-2 border-black px-2 py-0.5 rounded-full inline-block self-start z-10 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                        {card.rarity}
                      </div>
                      
                      <div className="text-center z-10">
                        <div className="w-24 h-24 mx-auto bg-gray-200 border-4 border-black rounded-full mb-4 shadow-[inset_0_0_10px_rgba(0,0,0,0.2)]" />
                        <h3 className="font-black text-black text-lg leading-tight uppercase">{card.name}</h3>
                      </div>
                      
                      {card.is_foil && (
                        <div className="absolute top-2 right-2 z-10">
                          <Sparkles className="w-6 h-6 text-yellow-500 fill-yellow-500 drop-shadow-[1px_1px_0px_rgba(0,0,0,1)]" />
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
