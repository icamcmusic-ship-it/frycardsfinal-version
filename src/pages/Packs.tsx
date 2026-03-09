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
  foil_chance?: number;
}

const PACK_ODDS = [
  { rarity: 'Common',     pct: '55%', color: 'text-slate-500' },
  { rarity: 'Uncommon',   pct: '25%', color: 'text-green-600' },
  { rarity: 'Rare',       pct: '12%', color: 'text-blue-600' },
  { rarity: 'Super-Rare', pct: '5%',  color: 'text-purple-600' },
  { rarity: 'Mythic',     pct: '2%',  color: 'text-yellow-600' },
  { rarity: 'Divine',     pct: '1%',  color: 'text-red-600' },
];

export function Packs() {
  const { profile } = useProfileStore();
  const [packs, setPacks] = useState<PackType[]>([]);
  const [loading, setLoading] = useState(true);
  const [opening, setOpening] = useState(false);
  const [openedCards, setOpenedCards] = useState<any[] | null>(null);
  const [showOdds, setShowOdds] = useState(false);

  const [inventory, setInventory] = useState<any[]>([]);

  useEffect(() => {
    fetchPacks();
    fetchInventory();
  }, [profile]);

  const fetchInventory = async () => {
    if (!profile) return;
    try {
      const { data, error } = await supabase
        .from('user_pack_inventory')
        .select(`
          id,
          pack_type_id,
          quantity,
          pack_types (
            name,
            image_url
          )
        `)
        .eq('user_id', profile.id)
        .gt('quantity', 0);
        
      if (error) throw error;
      setInventory(data || []);
    } catch (err) {
      console.error('Error fetching inventory:', err);
    }
  };

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
      
      // Refresh profile to update balances
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', profile.id)
        .single();
        
      if (profileData) {
        useProfileStore.getState().setProfile(profileData);
      }
      
      setTimeout(() => {
        setOpenedCards(data.cards);
        setOpening(false);
      }, 1500);

    } catch (err: any) {
      alert(err.message || 'Failed to open pack');
      setOpening(false);
    }
  };

  const handleBuyToInventory = async (packId: string, useGems: boolean) => {
    if (!profile) return;
    try {
      const { error } = await supabase.rpc('buy_pack_to_inventory', {
        p_pack_type_id: packId,
        p_use_gems: useGems
      });

      if (error) throw error;
      
      alert('Pack added to inventory!');
    } catch (err: any) {
      alert(err.message || 'Failed to buy pack');
    }
  };

  const handleOpenFromInventory = async (packTypeId: string) => {
    if (opening || !profile) return;
    setOpening(true);
    setOpenedCards(null);

    try {
      const { data, error } = await supabase.rpc('open_pack_from_inventory', {
        p_pack_type_id: packTypeId
      });

      if (error) throw error;
      
      // Refresh inventory
      fetchInventory();
      
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
              <div className="w-32 h-48 bg-red-500 rounded-xl border-4 border-black flex items-center justify-center transform group-hover:scale-105 group-hover:rotate-3 transition-all duration-300 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
                <img 
                  src={pack.image_url} 
                  alt={pack.name}
                  className="w-full h-full object-cover"
                  onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = '/fallback-card.png'; }}
                  referrerPolicy="no-referrer"
                />
              </div>
            </div>

            <div className="p-6 flex flex-col flex-1">
              <h3 className="text-2xl font-black text-black mb-2 uppercase">{pack.name}</h3>
              <p className="text-sm text-slate-600 font-bold mb-6 line-clamp-2 flex-1">{pack.description}</p>
              
              <button onClick={() => setShowOdds(!showOdds)}
                className="text-xs text-slate-500 font-bold underline mt-1 mb-2">
                {showOdds ? 'Hide Odds' : 'View Odds'}
              </button>
              {showOdds && (
                <div className="mt-2 space-y-1 text-xs font-bold border-t border-slate-200 pt-2">
                  {PACK_ODDS.map(o => (
                    <div key={o.rarity} className="flex justify-between">
                      <span className={o.color}>{o.rarity}</span>
                      <span>{o.pct}</span>
                    </div>
                  ))}
                  {pack.foil_chance && (
                    <div className="flex justify-between text-yellow-600 border-t border-slate-100 pt-1">
                      <span>✨ Foil chance</span>
                      <span>{(pack.foil_chance * 100).toFixed(1)}%</span>
                    </div>
                  )}
                </div>
              )}
              
              <div className="flex flex-col gap-3 mt-auto">
                {pack.cost_gold > 0 && (
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleOpenPack(pack.id, false)}
                      disabled={opening || (profile?.gold_balance || 0) < pack.cost_gold}
                      className="flex-[2] bg-yellow-400 hover:bg-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed text-black font-black py-3 rounded-xl border-4 border-black transition-transform active:translate-y-1 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center gap-2"
                    >
                      <Coins className="w-5 h-5 text-yellow-700" />
                      Open
                    </button>
                    <button 
                      onClick={() => handleBuyToInventory(pack.id, false)}
                      disabled={opening || (profile?.gold_balance || 0) < pack.cost_gold}
                      className="flex-1 bg-white hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed text-black font-black py-3 rounded-xl border-4 border-black transition-transform active:translate-y-1 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center"
                      title="Buy to Inventory"
                    >
                      Stash
                    </button>
                  </div>
                )}
                {pack.cost_gems > 0 && (
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleOpenPack(pack.id, true)}
                      disabled={opening || (profile?.gem_balance || 0) < pack.cost_gems}
                      className="flex-[2] bg-emerald-400 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-black font-black py-3 rounded-xl border-4 border-black transition-transform active:translate-y-1 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center gap-2"
                    >
                      <Gem className="w-5 h-5 text-emerald-700" />
                      Open
                    </button>
                    <button 
                      onClick={() => handleBuyToInventory(pack.id, true)}
                      disabled={opening || (profile?.gem_balance || 0) < pack.cost_gems}
                      className="flex-1 bg-white hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed text-black font-black py-3 rounded-xl border-4 border-black transition-transform active:translate-y-1 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center"
                      title="Buy to Inventory"
                    >
                      Stash
                    </button>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {inventory.length > 0 && (
        <div className="mt-16">
          <h2 className="text-3xl font-black text-black tracking-tight uppercase mb-6">Your Stash</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {inventory.map((item) => (
              <motion.div 
                key={item.id}
                whileHover={{ y: -4, rotate: -1 }}
                className="bg-white border-4 border-black rounded-xl overflow-hidden relative group shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col"
              >
                <div className="aspect-[3/4] bg-blue-100 flex items-center justify-center p-4 relative border-b-4 border-black">
                  <div className="w-full h-full bg-red-500 rounded-lg border-2 border-black flex items-center justify-center transform group-hover:scale-105 transition-all duration-300 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
                    <img 
                      src={item.pack_types.image_url} 
                      alt={item.pack_types.name}
                      className="w-full h-full object-cover"
                      onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = '/fallback-card.png'; }}
                      referrerPolicy="no-referrer"
                    />
                  </div>
                </div>
                <div className="p-3 flex flex-col flex-1">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="text-sm font-black text-black uppercase truncate" title={item.pack_types.name}>{item.pack_types.name}</h3>
                    {item.quantity > 1 && (
                      <span className="text-xs font-black bg-black text-white px-2 py-0.5 rounded-full border-2 border-white shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">
                        ×{item.quantity}
                      </span>
                    )}
                  </div>
                  <button 
                    onClick={() => handleOpenFromInventory(item.pack_type_id)}
                    disabled={opening}
                    className="mt-auto w-full bg-yellow-400 hover:bg-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed text-black font-black py-2 rounded-lg border-2 border-black transition-transform active:translate-y-1 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center text-sm"
                  >
                    Open
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

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
                  {(() => {
                    const RARITY_ORDER = ['Common', 'Uncommon', 'Rare', 'Super-Rare', 'Mythic', 'Divine'];
                    const sortedCards = [...(openedCards || [])].sort(
                      (a, b) => RARITY_ORDER.indexOf(a.rarity) - RARITY_ORDER.indexOf(b.rarity)
                    );
                    return sortedCards.map((card, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 80, rotateY: 180, scale: 0.8 }}
                        animate={{ opacity: 1, y: 0, rotateY: 0, scale: 1 }}
                        transition={{ delay: i * 0.25, type: 'spring', stiffness: 120 }}
                        className={cn(
                          "w-48 aspect-[2.5/3.5] rounded-xl relative overflow-hidden border-4 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] bg-white",
                          card.rarity === 'Divine' ? 'border-red-500 shadow-[0_0_30px_rgba(239,68,68,0.8)]' :
                          card.rarity === 'Mythic' ? 'border-yellow-400 shadow-[0_0_20px_rgba(234,179,8,0.6)]' :
                          card.rarity === 'Super-Rare' ? 'border-purple-500' :
                          card.rarity === 'Rare' ? 'border-blue-400' : 'border-slate-300'
                        )}>
                        <img src={card.image_url} alt={card.name} className="absolute inset-0 w-full h-full object-cover" />
                        <div className="absolute bottom-0 inset-x-0 bg-black/80 p-2">
                          <p className="text-white font-black text-xs uppercase truncate">{card.name}</p>
                          <p className="text-gray-300 text-[10px]">{card.rarity}{card.is_foil ? ' ✨' : ''}</p>
                        </div>
                      </motion.div>
                    ));
                  })()}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
