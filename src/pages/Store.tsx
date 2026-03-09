import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useProfileStore } from '../stores/profileStore';
import { PackageOpen, Sparkles, Loader2, Coins, Gem, Shirt, Store as StoreIcon } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

const PACK_ODDS = [
  { rarity: 'Common',     pct: '55%', color: 'text-slate-500' },
  { rarity: 'Uncommon',   pct: '25%', color: 'text-green-600' },
  { rarity: 'Rare',       pct: '12%', color: 'text-blue-600' },
  { rarity: 'Super-Rare', pct: '5%',  color: 'text-purple-600' },
  { rarity: 'Mythic',     pct: '2%',  color: 'text-yellow-600' },
  { rarity: 'Divine',     pct: '1%',  color: 'text-red-600' },
];

export function Store() {
  const { profile } = useProfileStore();
  const [activeTab, setActiveTab] = useState<'packs' | 'banners' | 'card_backs'>('packs');
  const [packs, setPacks] = useState<any[]>([]);
  const [shopItems, setShopItems] = useState<any[]>([]);
  const [userCosmetics, setUserCosmetics] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [opening, setOpening] = useState(false);
  const [packOpeningStep, setPackOpeningStep] = useState<'idle' | 'shaking' | 'revealing'>('idle');
  const [openedCards, setOpenedCards] = useState<any[] | null>(null);
  const [flippedCards, setFlippedCards] = useState<boolean[]>([]);
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
      alert('Item purchased!');
      fetchUserCosmetics();
    } catch (err: any) {
      alert(err.message || 'Failed to buy item');
    }
  };

  const handleEquip = async (itemId: string) => {
    try {
      const { error } = await supabase.rpc('equip_item', { p_item_id: itemId });
      if (error) throw error;
      fetchUserCosmetics();
    } catch (err: any) {
      alert(err.message || 'Failed to equip item');
    }
  };

  const handleUnequip = async (itemType: string) => {
    try {
      const { error } = await supabase.rpc('unequip_cosmetic_type', { p_item_type: itemType });
      if (error) throw error;
      fetchUserCosmetics();
    } catch (err: any) {
      alert(err.message || 'Failed to unequip item');
    }
  };

  const handleOpenPack = async (packId: string, useGems: boolean) => {
    if (opening || !profile) return;
    setOpening(true);
    setPackOpeningStep('shaking');

    try {
      const { data, error } = await supabase.rpc('open_pack', {
        p_user_id: profile.id,
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
      setFlippedCards(new Array(data.cards.length).fill(false));
      setPackOpeningStep('revealing');

    } catch (err: any) {
      alert(err.message || 'Failed to open pack');
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
      
      alert('Pack added to inventory!');
    } catch (err: any) {
      alert(err.message || 'Failed to buy pack');
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
      setFlippedCards(new Array(data.cards.length).fill(false));
      setPackOpeningStep('revealing');

    } catch (err: any) {
      alert(err.message || 'Failed to open pack');
      setOpening(false);
      setPackOpeningStep('idle');
    }
  };


  if (loading) return <div className="flex items-center justify-center h-full"><Loader2 className="w-10 h-10 animate-spin text-blue-500" /></div>;

  return (
    <div className="space-y-8">
      <h1 className="text-4xl font-black text-black tracking-tight uppercase">Store</h1>
      
      <div className="flex gap-4 border-b-4 border-black pb-4">
        {['packs', 'banners', 'card_backs'].map(tab => (
          <button 
            key={tab} 
            onClick={() => setActiveTab(tab as any)}
            className={cn("px-6 py-2 font-black uppercase rounded-t-xl border-t-4 border-l-4 border-r-4 border-black", activeTab === tab ? "bg-white" : "bg-gray-200")}
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
              className="bg-white border-4 border-black rounded-2xl overflow-hidden relative group shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col"
            >
              <div className="aspect-[4/3] bg-blue-100 flex items-center justify-center p-8 relative border-b-4 border-black">
                <div className="w-32 h-48 bg-red-500 rounded-xl border-4 border-black flex items-center justify-center transform group-hover:scale-105 group-hover:rotate-3 transition-all duration-300 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
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
                <h3 className="text-2xl font-black text-black mb-2 uppercase">{pack.name}</h3>
                <p className="text-sm text-slate-600 font-bold mb-6 line-clamp-2 flex-1">{pack.description}</p>
                
                <button onClick={() => setShowOdds(prev => ({...prev, [pack.id]: !prev[pack.id]}))}
                  className="text-xs text-slate-500 font-bold underline mt-1 mb-2">
                  {showOdds[pack.id] ? 'Hide Odds' : 'View Odds'}
                </button>
                {showOdds[pack.id] && (
                  <div className="mb-4 space-y-1 text-xs font-bold border-t border-slate-200 pt-2">
                    {PACK_ODDS.map(o => (
                      <div key={o.rarity} className="flex justify-between">
                        <span className={o.color}>{o.rarity}</span>
                        <span>{o.pct}</span>
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
      )}

      {activeTab === 'banners' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {shopItems.filter(i => i.item_type === 'profile_banner').map((item) => (
            <div key={item.id} className="bg-white border-4 border-black rounded-2xl p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col">
              <div className="h-24 bg-gray-200 rounded-xl border-4 border-black mb-4 overflow-hidden">
                <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" loading="lazy" />
              </div>
              <h3 className="text-xl font-black text-black uppercase mb-1">{item.name}</h3>
              <p className="text-sm text-slate-600 font-bold mb-4 line-clamp-2">{item.description}</p>
              <div className="mt-auto flex items-center justify-between">
                <div className="flex items-center gap-1 font-black text-lg">
                  {item.price_gems > 0 ? <Gem className="w-5 h-5 text-emerald-500" /> : <Coins className="w-5 h-5 text-yellow-500" />}
                  {item.price_gems > 0 ? item.price_gems : item.price_gold}
                </div>
                {userCosmetics.some(c => c.item_id === item.id) ? (
                  <button 
                    onClick={() => handleEquip(item.id)}
                    className="px-4 py-2 bg-black text-white font-black rounded-lg border-2 border-black"
                  >
                    Equip
                  </button>
                ) : (
                  <button 
                    onClick={() => handleBuyItem(item.id, item.price_gold, item.price_gems)}
                    className="px-4 py-2 bg-yellow-400 text-black font-black rounded-lg border-2 border-black"
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
            <div key={item.id} className="bg-white border-4 border-black rounded-2xl p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col">
              <div className="aspect-[3/4] bg-gray-200 rounded-xl border-4 border-black mb-4 overflow-hidden">
                <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" loading="lazy" />
              </div>
              <h3 className="text-xl font-black text-black uppercase mb-1">{item.name}</h3>
              <p className="text-sm text-slate-600 font-bold mb-4 line-clamp-2">{item.description}</p>
              <div className="mt-auto flex items-center justify-between">
                <div className="flex items-center gap-1 font-black text-lg">
                  {item.price_gems > 0 ? <Gem className="w-5 h-5 text-emerald-500" /> : <Coins className="w-5 h-5 text-yellow-500" />}
                  {item.price_gems > 0 ? item.price_gems : item.price_gold}
                </div>
                {userCosmetics.some(c => c.item_id === item.id) ? (
                  <button 
                    onClick={() => handleEquip(item.id)}
                    className="px-4 py-2 bg-black text-white font-black rounded-lg border-2 border-black"
                  >
                    Equip
                  </button>
                ) : (
                  <button 
                    onClick={() => handleBuyItem(item.id, item.price_gold, item.price_gems)}
                    className="px-4 py-2 bg-yellow-400 text-black font-black rounded-lg border-2 border-black"
                  >
                    Buy
                  </button>
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
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 w-full max-w-6xl">
              {openedCards.map((card: any, i: number) => (
                <motion.div
                  key={i}
                  initial={{ rotateY: 0 }}
                  animate={{ rotateY: flippedCards[i] ? 180 : 0 }}
                  onClick={() => setFlippedCards(prev => prev.map((f, idx) => idx === i ? true : f))}
                  className="w-full aspect-[3/4] cursor-pointer"
                  style={{ transformStyle: 'preserve-3d' }}
                >
                  <div className="w-full h-full bg-slate-800 border-4 border-white rounded-lg flex items-center justify-center text-white font-black" style={{ backfaceVisibility: 'hidden' }}>
                    ?
                  </div>
                  <div className="w-full h-full bg-white border-4 border-black rounded-lg p-2 absolute inset-0" style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
                    <img src={card.image_url} alt={card.name} className="w-full aspect-[3/4] object-cover rounded-lg mb-2" />
                    <p className="text-xs font-black text-center uppercase">{card.name}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
          {packOpeningStep === 'revealing' && flippedCards.every(f => f) && (
            <button 
              onClick={() => {
                setPackOpeningStep('idle');
                setOpening(false);
                setOpenedCards(null);
              }}
              className="mt-8 px-8 py-4 bg-white text-black font-black rounded-xl border-4 border-black"
            >
              Done
            </button>
          )}
        </div>
      )}
    </div>
  );
}

