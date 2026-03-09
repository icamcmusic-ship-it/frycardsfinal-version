import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useProfileStore } from '../stores/profileStore';
import { Loader2, Search, Filter, Lock, Unlock, Zap, LayoutGrid, Coins, Sparkles, Star } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

export function Collection() {
  const { profile } = useProfileStore();
  const [cards, setCards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'collection' | 'wishlist'>('collection');
  const [wishlist, setWishlist] = useState<any[]>([]);
  const [selectedCard, setSelectedCard] = useState<any>(null);

  useEffect(() => {
    if (profile) {
      if (activeTab === 'collection') {
        fetchCollection();
      } else {
        fetchWishlist();
      }
    }
  }, [profile, activeTab]);

  const fetchCollection = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('get_user_collection', {
        p_user_id: profile?.id,
        p_rarity: filter === 'all' ? null : filter.charAt(0).toUpperCase() + filter.slice(1),
        p_sort_by: 'rarity',
        p_limit: 1000,
        p_offset: 0
      });
      if (error) throw error;
      
      const fetchedCards = data || [];
      setCards(fetchedCards);

      // Mark unseen cards as seen
      const unseenCardIds = fetchedCards.filter((c: any) => c.is_new === true).map((c: any) => c.id);
      if (unseenCardIds.length > 0) {
        await supabase.rpc('mark_cards_seen', { p_card_ids: unseenCardIds });
      }
    } catch (err) {
      console.error('Error fetching collection:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchWishlist = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('get_wishlist');
      if (error) throw error;
      setWishlist(data || []);
    } catch (err) {
      console.error('Error fetching wishlist:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleWishlist = async (cardId: string) => {
    try {
      const { error } = await supabase.rpc('toggle_wishlist', {
        p_card_id: cardId
      });
      if (error) throw error;
      
      if (activeTab === 'wishlist') {
        fetchWishlist();
      } else {
        alert('Wishlist updated!');
      }
    } catch (err) {
      console.error('Error toggling wishlist:', err);
    }
  };

  const handleToggleLock = async (userCardId: string) => {
    try {
      const { data, error } = await supabase.rpc('toggle_card_lock', {
        p_user_card_id: userCardId
      });
      if (error) throw error;
      
      setCards(cards.map(c => 
        c.id === userCardId ? { ...c, is_locked: !c.is_locked } : c
      ));
    } catch (err) {
      console.error('Error toggling lock:', err);
    }
  };

  const getBaseValue = (rarity: string) => {
    switch (rarity) {
      case 'Common': return 10;
      case 'Uncommon': return 25;
      case 'Rare': return 100;
      case 'Super-Rare': return 250;
      case 'Mythic': return 500;
      case 'Divine': return 1000;
      default: return 0;
    }
  };

  const calculateMillValue = (card: any) => {
    const base = getBaseValue(card.rarity);
    return card.is_foil ? base * 3 : base;
  };

  const handleMill = async (card: any) => {
    const duplicates = card.quantity - 1;
    if (duplicates <= 0) return;
    
    const totalGold = calculateMillValue(card) * duplicates;
    if (!confirm(`Are you sure you want to mill ${duplicates} duplicate(s) of ${card.name}? You will receive ${totalGold} Gold.`)) return;
    
    try {
      const { data, error } = await supabase.rpc('mill_duplicates', {
        p_card_id: card.id,
        p_quantity: duplicates
      });
      if (error) throw error;
      
      fetchCollection(); // Refresh
      alert(`Successfully milled ${data.quantity_milled} cards for ${data.gold_earned} Gold!`);
    } catch (err: any) {
      alert(err.message || 'Failed to mill');
    }
  };

  const handleQuicksell = async (card: any) => {
    const value = { Common: 10, Uncommon: 25, Rare: 100, 'Super-Rare': 250, Mythic: 500, Divine: 1000 }[card.rarity] ?? 10;
    if (!confirm(`Quicksell ${card.name} for ${value} Gold?`)) return;
    const { data, error } = await supabase.rpc('quicksell_card', {
      p_card_id: card.id,
      p_is_foil: false,
      p_quantity: 1,
    });
    if (error) { alert(error.message); return; }
    alert(`Sold for ${(data as any).gold_earned} Gold!`);
    fetchCollection(); // refresh
  };

  const handleBulkMill = async () => {
    if (!confirm('Are you sure you want to mill ALL duplicate cards? This cannot be undone.')) return;
    
    try {
      const { data, error } = await supabase.rpc('mill_bulk_duplicates');
      if (error) throw error;
      
      fetchCollection(); // Refresh
      
      alert(`Successfully milled ${data.cards_milled} cards for ${data.gold_earned} Gold!`);
    } catch (err: any) {
      alert(err.message || 'Failed to bulk mill');
    }
  };

  const filteredCards = (activeTab === 'collection' ? cards : wishlist).filter(c => {
    if (filter !== 'all' && c.rarity.toLowerCase() !== filter) return false;
    if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-black tracking-tight uppercase">Collection</h1>
          <p className="text-slate-600 font-bold mt-1">{cards.length} cards collected</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex bg-white border-4 border-black rounded-xl p-1 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <button
              onClick={() => setActiveTab('collection')}
              className={cn(
                "px-6 py-2 rounded-lg font-black text-sm uppercase transition-colors",
                activeTab === 'collection' ? "bg-black text-white" : "text-slate-600 hover:bg-slate-100"
              )}
            >
              Collection
            </button>
            <button
              onClick={() => setActiveTab('wishlist')}
              className={cn(
                "px-6 py-2 rounded-lg font-black text-sm uppercase transition-colors",
                activeTab === 'wishlist' ? "bg-black text-white" : "text-slate-600 hover:bg-slate-100"
              )}
            >
              Wishlist
            </button>
          </div>

          {activeTab === 'collection' && (
            <button
              onClick={handleBulkMill}
              className="px-4 py-2 bg-yellow-400 hover:bg-yellow-500 text-black font-black rounded-xl border-4 border-black transition-transform active:translate-y-1 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center gap-2"
            >
              <Coins className="w-5 h-5" />
              Mill All Duplicates
            </button>
          )}
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search cards..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full sm:w-64 pl-10 pr-4 py-2 bg-white border-4 border-black rounded-xl text-black font-bold placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-blue-500/50 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
            />
          </div>
          
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="w-full sm:w-48 pl-10 pr-4 py-2 bg-white border-4 border-black rounded-xl text-black font-bold appearance-none focus:outline-none focus:ring-4 focus:ring-blue-500/50 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
            >
              <option value="all">All Rarities</option>
              <option value="common">Common</option>
              <option value="uncommon">Uncommon</option>
              <option value="rare">Rare</option>
              <option value="mythic">Mythic</option>
              <option value="divine">Divine</option>
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
        {filteredCards.map((card) => (
          <motion.div 
            key={card.id}
            layout
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ y: -4, rotate: -2 }}
            onClick={() => setSelectedCard(card)}
            className={cn(
              "aspect-[2/3] rounded-xl p-4 relative overflow-hidden flex flex-col justify-between border-4 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] group cursor-pointer bg-white transition-all duration-300",
              card.rarity === 'Divine' ? 'border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.5)]' :
              card.rarity === 'Mythic' ? 'border-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.5)]' :
              card.rarity === 'Super-Rare' ? 'border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.5)]' :
              card.rarity === 'Rare' ? 'border-blue-500' :
              card.rarity === 'Uncommon' ? 'border-green-500' :
              'border-slate-400'
            )}
          >
            {card.is_foil && (
              <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/60 to-transparent animate-[shimmer_2s_infinite] pointer-events-none z-20" />
            )}
            
            {card.foil_quantity > 0 && (
              <div className="absolute inset-0 pointer-events-none z-10 rounded-xl"
                style={{
                  background: 'linear-gradient(135deg, transparent 40%, rgba(255,215,0,0.3) 50%, transparent 60%)',
                  backgroundSize: '200% 200%',
                  animation: 'foilShimmer 2s ease-in-out infinite',
                }} />
            )}
            
            <div className="flex justify-between items-start z-10">
              <div className="text-xs font-black uppercase tracking-wider text-black bg-white border-2 border-black px-2 py-0.5 rounded-full shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                {card.rarity}
              </div>
              <div className="flex gap-1">
                {card.foil_quantity > 0 && (
                  <div className="absolute top-2 left-2 z-20 bg-yellow-400 text-black text-[10px] font-black px-1.5 py-0.5 rounded border border-black flex items-center gap-1">
                    ✨ x{card.foil_quantity}
                  </div>
                )}
                {card.quantity > 1 && (
                  <div className="bg-black text-white text-xs font-black px-2 py-1 rounded-lg border-2 border-white shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]">
                    x{card.quantity}
                  </div>
                )}
              </div>
            </div>
            
            <div className="text-center z-10 flex-1 flex flex-col justify-center">
              <div className="w-full aspect-[3/4] mx-auto bg-gray-200 border-4 border-black rounded-lg mb-3 shadow-[inset_0_0_10px_rgba(0,0,0,0.2)] overflow-hidden">
                <img 
                  src={card.image_url} 
                  alt={card.name}
                  className="w-full h-full object-cover"
                  onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = '/fallback-card.png'; }}
                  referrerPolicy="no-referrer"
                />
              </div>
              <h3 className="font-black text-black text-sm leading-tight uppercase line-clamp-2">{card.name}</h3>
            </div>

            {card.is_foil && (
              <div className="absolute top-2 right-12 z-10">
                <Sparkles className="w-5 h-5 text-yellow-500 fill-yellow-500 drop-shadow-[1px_1px_0px_rgba(0,0,0,1)]" />
              </div>
            )}

            {/* Hover Actions */}
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-3 z-30">
              <div className="text-center px-3 mb-1">
                <p className="text-white font-black text-sm uppercase">{card.name}</p>
                <p className="text-gray-300 text-xs font-bold">{card.rarity} · {card.card_type}</p>
                {card.flavor_text && <p className="text-gray-400 text-[10px] italic mt-1 line-clamp-2">"{card.flavor_text}"</p>}
              </div>

              <button 
                onClick={(e) => { e.stopPropagation(); handleToggleWishlist(card.id); }}
                className="p-3 bg-white hover:bg-gray-200 text-black rounded-xl border-4 border-black transition-transform active:translate-y-1 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                title={activeTab === 'wishlist' ? "Remove from Wishlist" : "Add to Wishlist"}
              >
                <Star className={cn("w-5 h-5", activeTab === 'wishlist' ? "fill-yellow-400 text-yellow-500" : "text-slate-400")} />
              </button>

              {activeTab === 'collection' && (
                <>
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleToggleLock(card.user_card_id); }}
                    className="p-3 bg-white hover:bg-gray-200 text-black rounded-xl border-4 border-black transition-transform active:translate-y-1 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                    title={card.is_locked ? "Unlock" : "Lock"}
                  >
                    {card.is_locked ? <Lock className="w-5 h-5" /> : <Unlock className="w-5 h-5" />}
                  </button>
                  
                  {!card.is_locked && card.quantity > 1 && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleMill(card); }}
                      className="px-4 py-2 bg-yellow-400 hover:bg-yellow-500 text-black font-black text-sm rounded-xl border-4 border-black transition-transform active:translate-y-1 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center gap-2"
                    >
                      <Coins className="w-4 h-4" />
                      Mill
                    </button>
                  )}
                  {!card.is_locked && (
                    <button onClick={(e) => { e.stopPropagation(); handleQuicksell(card); }}
                      className="px-4 py-2 bg-emerald-400 hover:bg-emerald-500 text-black font-black text-sm rounded-xl border-4 border-black transition-transform active:translate-y-1 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center gap-2">
                      <Coins className="w-4 h-4" /> Sell
                    </button>
                  )}
                </>
              )}
            </div>
          </motion.div>
        ))}
      </div>
      
      {filteredCards.length === 0 && (
        <div className="text-center py-20 bg-white border-4 border-black rounded-2xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <div className="w-20 h-20 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4 border-4 border-black">
            <LayoutGrid className="w-10 h-10 text-slate-400" />
          </div>
          <h3 className="text-2xl font-black text-black mb-2 uppercase">No cards found</h3>
          <p className="text-slate-600 font-bold">Try adjusting your search or filters</p>
        </div>
      )}

      {selectedCard && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setSelectedCard(null)}>
          <div className="bg-white border-4 border-black rounded-2xl p-6 max-w-sm w-full shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]" onClick={e => e.stopPropagation()}>
            <div className="flex gap-4">
              <img src={selectedCard.image_url} alt={selectedCard.name}
                className="w-32 aspect-[2.5/3.5] object-cover rounded-lg border-4 border-black" />
              <div className="flex-1 space-y-2">
                <h2 className="text-xl font-black uppercase">{selectedCard.name}</h2>
                <span className="inline-block text-xs font-black px-2 py-0.5 rounded border-2 border-black bg-gray-100">{selectedCard.rarity}</span>
                <p className="text-sm font-bold text-slate-500">{selectedCard.card_type}{selectedCard.sub_type ? ` · ${selectedCard.sub_type}` : ''}</p>
                {selectedCard.element && <p className="text-xs font-bold text-blue-600">{selectedCard.element}</p>}
                {selectedCard.flavor_text && <p className="text-xs italic text-slate-400">"{selectedCard.flavor_text}"</p>}
              </div>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              {selectedCard.hp != null && <div className="bg-red-50 border-2 border-red-300 rounded-lg p-2"><p className="text-xs font-bold text-slate-500">HP</p><p className="font-black">{selectedCard.hp}</p></div>}
              {selectedCard.attack != null && <div className="bg-orange-50 border-2 border-orange-300 rounded-lg p-2"><p className="text-xs font-bold text-slate-500">ATK</p><p className="font-black">{selectedCard.attack}</p></div>}
              {selectedCard.defense != null && <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-2"><p className="text-xs font-bold text-slate-500">DEF</p><p className="font-black">{selectedCard.defense}</p></div>}
            </div>
            {selectedCard.ability_text && (
              <div className="mt-3 p-3 bg-purple-50 border-2 border-purple-300 rounded-lg">
                <p className="text-xs font-black text-purple-700 uppercase mb-1">{selectedCard.ability_type || 'Ability'}</p>
                <p className="text-sm font-bold">{selectedCard.ability_text}</p>
              </div>
            )}
            {selectedCard.keywords?.length > 0 && (
              <div className="mt-3 flex gap-2 flex-wrap">
                {selectedCard.keywords.map((kw: string) => (
                  <span key={kw} className="text-xs font-black bg-gray-100 border border-black rounded px-2 py-0.5">{kw}</span>
                ))}
              </div>
            )}
            {/* Foil info */}
            <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
              <div className="bg-gray-50 border border-black rounded p-2 text-center">
                <p className="text-xs text-slate-500">Normal</p>
                <p className="font-black">x{selectedCard.quantity ?? 0}</p>
              </div>
              {selectedCard.foil_quantity > 0 && (
                <div className="bg-yellow-50 border border-yellow-400 rounded p-2 text-center">
                  <p className="text-xs text-yellow-600">✨ Foil</p>
                  <p className="font-black">x{selectedCard.foil_quantity}</p>
                </div>
              )}
            </div>
            <button onClick={() => setSelectedCard(null)} className="mt-4 w-full py-2 bg-black text-white font-black rounded-xl border-4 border-black">Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
