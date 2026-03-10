import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useProfileStore } from '../stores/profileStore';
import { PackageOpen, Sparkles, Loader2, Coins, Gem, Shirt, Store as StoreIcon } from 'lucide-react';
import { motion } from 'motion/react';
import { cn, getRarityStyles } from '../lib/utils';
import toast from 'react-hot-toast';
import { CardDisplay } from '../components/CardDisplay';

import { useLocation } from 'react-router-dom';

const PACK_ODDS = [
  { rarity: 'Common',     pct: '55%', color: 'text-slate-500' },
  { rarity: 'Uncommon',   pct: '25%', color: 'text-green-600' },
  { rarity: 'Rare',       pct: '12%', color: 'text-blue-600' },
  { rarity: 'Super-Rare', pct: '5%',  color: 'text-purple-600' },
  { rarity: 'Mythic',     pct: '2%',  color: 'text-yellow-600' },
  { rarity: 'Divine',     pct: '1%',  color: 'text-red-600' },
];

export function Store() {
  const location = useLocation();
  const { profile } = useProfileStore();
  const [activeTab, setActiveTab] = useState<'packs' | 'banners' | 'card_backs' | 'inventory'>(
    location.pathname === '/inventory' ? 'inventory' : 'packs'
  );
  const [packs, setPacks] = useState<any[]>([]);
  const [shopItems, setShopItems] = useState<any[]>([]);
  const [userCosmetics, setUserCosmetics] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [opening, setOpening] = useState(false);
  const [packOpeningStep, setPackOpeningStep] = useState<'idle' | 'shaking' | 'revealing'>('idle');
  const [openedCards, setOpenedCards] = useState<any[] | null>(null);
  const [openingSummary, setOpeningSummary] = useState<{ xp_gained: number, new_card_count: number } | null>(null);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [revealedCards, setRevealedCards] = useState<any[]>([]);
  const [showOdds, setShowOdds] = useState<Record<string, boolean>>({});
  const [inventory, setInventory] = useState<any[]>([]);
  const [useGems, setUseGems] = useState(false);

  useEffect(() => {
    fetchData();
  }, [profile]);

  const fetchData = async () => {
    setLoading(true);
    await Promise.all([fetchPacks(), fetchShopItems(), fetchUserCosmetics(), fetchInventory()]);
    setLoading(false);
  };

  const fetchPacks = async () => {
    const { data } = await supabase.rpc('get_available_packs');
    setPacks(data || []);
  };

  const fetchShopItems = async () => {
    const { data } = await supabase.from('shop_items').select('*');
    setShopItems(data || []);
  };

  const fetchUserCosmetics = async () => {
    const { data } = await supabase.rpc('get_user_cosmetics');
    setUserCosmetics(data || []);
  };

  const fetchInventory = async () => {
    if (!profile) return;
    const { data } = await supabase
      .from('user_pack_inventory')
      .select(`id, pack_type_id, quantity, pack_types (name, image_url)`)
      .eq('user_id', profile.id)
      .gt('quantity', 0);
    setInventory(data || []);
  };

  const handleBuyItem = async (itemId: string, priceGold: number, priceGems: number) => {
    if (!confirm('Are you sure you want to buy this item?')) return;
    try {
      const { error } = await supabase.rpc('buy_shop_item', { p_item_id: itemId, p_use_gems: useGems });
      if (error) throw error;
      toast.success('Item purchased!');
      fetchUserCosmetics();
    } catch (err: any) {
      toast.error(err.message || 'Failed to buy item');
    }
  };

  const handleEquip = async (userItemId: string) => {
    try {
      const { data, error } = await supabase.rpc('equip_item', { p_user_item_id: userItemId });
      if (error || data?.success === false) {
        toast.error(error?.message || data?.error || 'Failed to equip');
        return;
      }
      toast.success('Equipped!');
      fetchUserCosmetics();
    } catch (err: any) {
      toast.error(err.message || 'Failed to equip item');
    }
  };

  const handleUnequip = async (itemType: string) => {
    try {
      const { error } = await supabase.rpc('unequip_cosmetic_type', { p_item_type: itemType });
      if (error) throw error;
      fetchUserCosmetics();
    } catch (err: any) {
      toast.error(err.message || 'Failed to unequip item');
    }
  };

  const handleOpenPack = async (packId: string, useGems: boolean) => {
    if (opening || !profile) return;
    setOpening(true);
    setPackOpeningStep('shaking');

    try {
      const { data, error } = await supabase.rpc('open_pack', {
        p_pack_type_id: packId,
        p_use_gems: useGems
      });

      if (error) throw error;
      
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', profile.id)
        .single();
        
      if (profileData) {
        useProfileStore.getState().setProfile(profileData);
      }
      
      setOpenedCards(data.cards);
      setOpeningSummary({ xp_gained: data.xp_gained, new_card_count: data.new_card_count });
      setCurrentCardIndex(0);
      setRevealedCards([]);
      setPackOpeningStep('revealing');

      fetchPacks(); // Refresh pity counter

    } catch (err: any) {
      toast.error(err.message || 'Failed to open pack');
      setOpening(false);
      setPackOpeningStep('idle');
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
      
      toast.success('Pack added to inventory!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to buy pack');
    }
  };

  const handleOpenFromInventory = async (packTypeId: string) => {
    if (opening || !profile) return;
    setOpening(true);
    setPackOpeningStep('shaking');

    try {
      const { data, error } = await supabase.rpc('open_pack_from_inventory', {
        p_pack_type_id: packTypeId
      });

      if (error) throw error;
      
      fetchInventory();
      
      setOpenedCards(data.cards);
      setOpeningSummary({ xp_gained: data.xp_gained, new_card_count: data.new_card_count });
      setCurrentCardIndex(0);
      setRevealedCards([]);
      setPackOpeningStep('revealing');

      fetchPacks(); // Refresh pity counter

    } catch (err: any) {
      toast.error(err.message || 'Failed to open pack');
      setOpening(false);
      setPackOpeningStep('idle');
    }
  };


  if (loading) return <div className="flex items-center justify-center h-full"><Loader2 className="w-10 h-10 animate-spin text-blue-500" /></div>;

  return (
    <div className="space-y-8">
      <h1 className="text-4xl font-black text-[var(--text)] tracking-tight uppercase">Store</h1>
      
      <div className="flex gap-4 border-b-4 border-[var(--border)] pb-4 overflow-x-auto scrollbar-hide">
        {['packs', 'banners', 'card_backs', 'inventory'].map(tab => (
          <button 
            key={tab} 
            onClick={() => setActiveTab(tab as any)}
            className={cn("px-6 py-2 font-black uppercase rounded-t-xl border-t-4 border-l-4 border-r-4 border-[var(--border)] whitespace-nowrap", activeTab === tab ? "bg-[var(--surface)] text-[var(--text)]" : "bg-[var(--bg)] text-slate-500")}
          >
            {tab.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Content based on activeTab */}
      {activeTab === 'packs' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {packs.map((pack) => (
            <motion.div 
              key={pack.id}
              whileHover={{ y: -4, rotate: -1 }}
              className="bg-[var(--surface)] border-4 border-[var(--border)] rounded-2xl overflow-hidden relative group shadow-[8px_8px_0px_0px_var(--border)] flex flex-col"
            >
              <div className="aspect-[4/3] bg-blue-100 flex items-center justify-center p-8 relative border-b-4 border-[var(--border)]">
                <div className="w-32 h-48 bg-red-500 rounded-xl border-4 border-[var(--border)] flex items-center justify-center transform group-hover:scale-105 group-hover:rotate-3 transition-all duration-300 shadow-[4px_4px_0px_0px_var(--border)] overflow-hidden">
                  <img 
                    src={pack.image_url} 
                    alt={pack.name}
                    className="w-full h-full object-cover"
                    onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = '/fallback-card.png'; }}
                    referrerPolicy="no-referrer"
                    loading="lazy"
                  />
                </div>
              </div>

              <div className="p-6 flex flex-col flex-1">
                <h3 className="text-2xl font-black text-[var(--text)] mb-2 uppercase">{pack.name}</h3>
                {pack.next_pity_in !== undefined && (
                  <p className="text-[10px] font-black uppercase text-blue-500 mb-1">
                    Pity in {pack.next_pity_in} packs
                  </p>
                )}
                <p className="text-sm text-slate-600 font-bold mb-6 line-clamp-2 flex-1">{pack.description}</p>
                
                <button onClick={() => setShowOdds(prev => ({...prev, [pack.id]: !prev[pack.id]}))}
                  className="text-xs text-slate-500 font-bold underline mt-1 mb-2">
                  {showOdds[pack.id] ? 'Hide Odds' : 'View Odds'}
                </button>
                {showOdds[pack.id] && (
                  <div className="mb-4 space-y-1 text-xs font-bold border-t border-[var(--border)] pt-2">
                    {PACK_ODDS.map(o => (
                      <div key={o.rarity} className="flex justify-between">
                        <span className={o.color}>{o.rarity}</span>
                        <span className="text-[var(--text)]">{o.pct}</span>
                      </div>
                    ))}
                    {pack.foil_chance && <div className="flex justify-between text-yellow-600"><span>Foil Chance</span><span>{pack.foil_chance}%</span></div>}
                  </div>
                )}
                
                <div className="flex flex-col gap-3 mt-auto">
                  {pack.cost_gold > 0 && (
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleOpenPack(pack.id, false)}
                        disabled={opening || (profile?.gold_balance || 0) < pack.cost_gold}
                        className="flex-[2] bg-yellow-400 hover:bg-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed text-black font-black py-3 rounded-xl border-4 border-[var(--border)] transition-transform active:translate-y-1 shadow-[4px_4px_0px_0px_var(--border)] flex items-center justify-center gap-2"
                      >
                        <Coins className="w-5 h-5 text-yellow-700" />
                        Open
                      </button>
                      <button 
                        onClick={() => handleBuyToInventory(pack.id, false)}
                        disabled={opening || (profile?.gold_balance || 0) < pack.cost_gold}
                        className="flex-1 bg-[var(--bg)] hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed text-[var(--text)] font-black py-3 rounded-xl border-4 border-[var(--border)] transition-transform active:translate-y-1 shadow-[4px_4px_0px_0px_var(--border)] flex items-center justify-center"
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
                        className="flex-[2] bg-emerald-400 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-black font-black py-3 rounded-xl border-4 border-[var(--border)] transition-transform active:translate-y-1 shadow-[4px_4px_0px_0px_var(--border)] flex items-center justify-center gap-2"
                      >
                        <Gem className="w-5 h-5 text-emerald-700" />
                        Open
                      </button>
                      <button 
                        onClick={() => handleBuyToInventory(pack.id, true)}
                        disabled={opening || (profile?.gem_balance || 0) < pack.cost_gems}
                        className="flex-1 bg-[var(--bg)] hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed text-[var(--text)] font-black py-3 rounded-xl border-4 border-[var(--border)] transition-transform active:translate-y-1 shadow-[4px_4px_0px_0px_var(--border)] flex items-center justify-center"
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
      )}

      {activeTab === 'banners' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {shopItems.filter(i => i.item_type === 'profile_banner').map((item) => (
            <div key={item.id} className="bg-[var(--surface)] border-4 border-[var(--border)] rounded-2xl p-6 shadow-[8px_8px_0px_0px_var(--border)] flex flex-col">
              <div className="h-24 bg-gray-200 rounded-xl border-4 border-[var(--border)] mb-4 overflow-hidden">
                <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" loading="lazy" />
              </div>
              <h3 className="text-xl font-black text-[var(--text)] uppercase mb-1">{item.name}</h3>
              <p className="text-sm text-slate-600 font-bold mb-4 line-clamp-2">{item.description}</p>
              <div className="mt-auto flex items-center justify-between">
                <div className="flex items-center gap-1 font-black text-lg text-[var(--text)]">
                  {item.cost_gems > 0
                    ? <><Gem className="w-4 h-4 text-emerald-500" /> {item.cost_gems} Gems</>
                    : <><Coins className="w-4 h-4 text-yellow-500" /> {item.cost_gold} Gold</>
                  }
                </div>
                {userCosmetics.some(c => c.item_id === item.id) ? (
                  <button 
                    onClick={() => handleEquip(userCosmetics.find(c => c.item_id === item.id)!.user_item_id)}
                    className="px-4 py-2 bg-black text-white font-black rounded-lg border-2 border-[var(--border)]"
                  >
                    Equip
                  </button>
                ) : (
                  <button 
                    onClick={() => handleBuyItem(item.id, item.cost_gold, item.cost_gems)}
                    className="px-4 py-2 bg-yellow-400 text-black font-black rounded-lg border-2 border-[var(--border)]"
                  >
                    Buy
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'card_backs' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {shopItems.filter(i => i.item_type === 'card_back').map((item) => (
            <div key={item.id} className="bg-[var(--surface)] border-4 border-[var(--border)] rounded-2xl p-6 shadow-[8px_8px_0px_0px_var(--border)] flex flex-col">
              <div className="aspect-[3/4] bg-gray-200 rounded-xl border-4 border-[var(--border)] mb-4 overflow-hidden">
                <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" loading="lazy" />
              </div>
              <h3 className="text-xl font-black text-[var(--text)] uppercase mb-1">{item.name}</h3>
              <p className="text-sm text-slate-600 font-bold mb-4 line-clamp-2">{item.description}</p>
              <div className="mt-auto flex items-center justify-between">
                <div className="flex items-center gap-1 font-black text-lg text-[var(--text)]">
                  {item.cost_gems > 0
                    ? <><Gem className="w-4 h-4 text-emerald-500" /> {item.cost_gems} Gems</>
                    : <><Coins className="w-4 h-4 text-yellow-500" /> {item.cost_gold} Gold</>
                  }
                </div>
                {userCosmetics.some(c => c.item_id === item.id) ? (
                  <button 
                    onClick={() => handleEquip(userCosmetics.find(c => c.item_id === item.id)!.user_item_id)}
                    className="px-4 py-2 bg-black text-white font-black rounded-lg border-2 border-[var(--border)]"
                  >
                    Equip
                  </button>
                ) : (
                  <button 
                    onClick={() => handleBuyItem(item.id, item.cost_gold, item.cost_gems)}
                    className="px-4 py-2 bg-yellow-400 text-black font-black rounded-lg border-2 border-[var(--border)]"
                  >
                    Buy
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'inventory' && (
        <div className="space-y-6">
          <h2 className="text-2xl font-black uppercase text-[var(--text)]">Your Inventory</h2>
          {['profile_banner', 'card_back'].map(slotType => (
            <div key={slotType} className="bg-[var(--surface)] border-4 border-[var(--border)] rounded-2xl p-6 shadow-[8px_8px_0px_0px_var(--border)]">
              <h3 className="font-black uppercase mb-4 text-[var(--text)]">{slotType.replace('_', ' ')}</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {userCosmetics.filter(c => c.item_type === slotType).map(c => (
                  <div key={c.user_item_id} className={cn(
                    "border-4 rounded-xl p-3 text-center transition-all",
                    c.is_equipped ? "border-yellow-500 bg-yellow-50" : "border-[var(--border)] bg-[var(--bg)]"
                  )}>
                    <div className="aspect-video rounded overflow-hidden mb-2 border-2 border-[var(--border)]">
                      <img src={c.image_url} alt={c.name} className="w-full h-full object-cover" />
                    </div>
                    <p className="text-xs font-black uppercase text-[var(--text)]">{c.name}</p>
                    <div className="flex gap-1 mt-2">
                      {!c.is_equipped ? (
                        <button onClick={() => handleEquip(c.user_item_id)}
                          className="flex-1 py-1 bg-black text-white text-xs font-black rounded border-2 border-black hover:bg-gray-800">
                          Equip
                        </button>
                      ) : (
                        <button onClick={() => handleUnequip(c.item_type)}
                          className="flex-1 py-1 bg-yellow-400 text-black text-xs font-black rounded border-2 border-black hover:bg-yellow-500">
                          Unequip
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                {userCosmetics.filter(c => c.item_type === slotType).length === 0 && (
                  <p className="text-slate-500 font-bold col-span-full">No items owned in this category.</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {packOpeningStep !== 'idle' && (
        <div className="fixed inset-0 bg-black/90 z-50 flex flex-col items-center justify-center p-4">
          {packOpeningStep === 'shaking' && (
            <motion.div
              animate={{ x: [-10, 10, -10, 10, 0] }}
              transition={{ duration: 0.5, repeat: Infinity }}
              className="text-white text-4xl font-black uppercase"
            >
              Opening Pack...
            </motion.div>
          )}
          {packOpeningStep === 'revealing' && openedCards && (
            <div className="flex flex-col items-center gap-8">
              <p className="text-white font-black text-xl uppercase tracking-widest">
                {currentCardIndex < openedCards.length
                  ? `${openedCards.length - currentCardIndex} cards remaining — click to reveal!`
                  : '🎉 All cards revealed!'}
              </p>

              {/* Stack of unrevealed cards */}
              {currentCardIndex < openedCards.length && (
                <motion.div
                  key={currentCardIndex}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => {
                    setRevealedCards(prev => [...prev, openedCards[currentCardIndex]]);
                    setCurrentCardIndex(prev => prev + 1);
                  }}
                  className="w-48 h-72 cursor-pointer relative"
                  style={{ transformStyle: 'preserve-3d' }}
                >
                  {/* Card back */}
                  <div className="absolute inset-0 bg-indigo-900 border-4 border-white rounded-2xl flex items-center justify-center shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                    <span className="text-white font-black text-5xl">?</span>
                  </div>
                  {/* Stack depth indicators */}
                  {Array.from({length: Math.min(3, openedCards.length - currentCardIndex - 1)}).map((_, i) => (
                    <div key={i}
                      className="absolute inset-0 bg-indigo-800 border-4 border-white/50 rounded-2xl"
                      style={{ transform: `translateY(${(i+1)*4}px) translateX(${(i+1)*2}px)`, zIndex: -(i+1) }}
                    />
                  ))}
                </motion.div>
              )}

              {/* Revealed cards row */}
              <div className="flex flex-wrap justify-center gap-4 max-w-4xl">
                {revealedCards.map((card: any, i: number) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, scale: 0.5, y: -50 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ type: 'spring', stiffness: 300 }}
                    className="w-28 h-40 relative rounded-xl overflow-hidden border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                  >
                    <CardDisplay card={card} />
                  </motion.div>
                ))}
              </div>

              {currentCardIndex >= openedCards.length && (
                <div className="flex flex-col items-center gap-4">
                  {openingSummary && (
                    <div className="flex gap-4 bg-white/10 backdrop-blur-md p-4 rounded-xl border-2 border-white/20">
                      <div className="text-center">
                        <p className="text-[10px] font-black uppercase text-blue-300">XP Gained</p>
                        <p className="text-xl font-black text-white">+{openingSummary.xp_gained}</p>
                      </div>
                      <div className="w-px bg-white/20" />
                      <div className="text-center">
                        <p className="text-[10px] font-black uppercase text-yellow-300">New Cards</p>
                        <p className="text-xl font-black text-white">{openingSummary.new_card_count}</p>
                      </div>
                    </div>
                  )}
                  <button onClick={() => { setPackOpeningStep('idle'); setOpening(false); setOpenedCards(null); setOpeningSummary(null); setCurrentCardIndex(0); setRevealedCards([]); }}
                    className="px-8 py-4 bg-white text-black font-black rounded-xl border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                    Done
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

