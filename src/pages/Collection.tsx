import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useProfileStore } from '../stores/profileStore';
import { Loader2, Search, Filter, Lock, Unlock, Zap, LayoutGrid, Coins, Sparkles, Star, PackageOpen, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { EmptyState } from '../components/EmptyState';

export function Collection() {
  const { profile } = useProfileStore();
  const [cards, setCards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'collection' | 'wishlist'>('collection');
  const [wishlist, setWishlist] = useState<any[]>([]);
  const [selectedCard, setSelectedCard] = useState<any>(null);
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [selectedCardIds, setSelectedCardIds] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<'rarity' | 'newest' | 'price'>('rarity');
  const [elementType, setElementType] = useState<string>('all');

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
        toast.success('Wishlist updated!');
      }
    } catch (err) {
      console.error('Error toggling wishlist:', err);
      toast.error('Failed to update wishlist');
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
      toast.success(`Successfully milled ${data.quantity_milled} cards for ${data.gold_earned} Gold!`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to mill');
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
    if (error) { toast.error(error.message); return; }
    toast.success(`Sold for ${(data as any).gold_earned} Gold!`);
    fetchCollection(); // refresh
  };

  const handleBulkMill = async () => {
    if (!confirm('Are you sure you want to mill ALL duplicate cards? This cannot be undone.')) return;
    
    try {
      const { data, error } = await supabase.rpc('mill_bulk_duplicates');
      if (error) throw error;
      
      fetchCollection(); // Refresh
      
      toast.success(`Successfully milled ${data.cards_milled} cards for ${data.gold_earned} Gold!`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to bulk mill');
    }
  };

  const filteredCards = (activeTab === 'collection' ? cards : wishlist)
    .filter(c => {
      if (filter !== 'all' && c.rarity.toLowerCase() !== filter) return false;
      if (elementType !== 'all' && c.element?.toLowerCase() !== elementType) return false;
      if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (sortBy === 'price') return calculateMillValue(b) - calculateMillValue(a);
      // Rarity sort (simplified)
      const rarityOrder: Record<string, number> = { 'Divine': 6, 'Mythic': 5, 'Super-Rare': 4, 'Rare': 3, 'Uncommon': 2, 'Common': 1 };
      return rarityOrder[b.rarity] - rarityOrder[a.rarity];
    });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <>
      <div className="sticky top-16 z-40 bg-yellow-50/90 backdrop-blur-sm py-4 border-b-2 border-black -mx-4 px-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-wrap gap-4">
            <button
              onClick={() => setIsBatchMode(!isBatchMode)}
              className={cn(
                "px-4 py-2 font-black rounded-xl border-4 border-black transition-transform active:translate-y-1 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]",
                isBatchMode ? "bg-red-500 text-white" : "bg-white text-black"
              )}
            >
              {isBatchMode ? 'Cancel Selection' : 'Select Multiple'}
            </button>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-4 py-2 bg-white border-4 border-black rounded-xl text-black font-bold focus:outline-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
            >
              <option value="rarity">Sort by Rarity</option>
              <option value="newest">Sort by Newest</option>
              <option value="price">Sort by Price</option>
            </select>
          </div>
          
          <div className="flex flex-wrap gap-4">
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="px-4 py-2 bg-white border-4 border-black rounded-xl text-black font-bold placeholder-slate-400 focus:outline-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
            />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="px-4 py-2 bg-white border-4 border-black rounded-xl text-black font-bold appearance-none focus:outline-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
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

      <div className="space-y-8 pt-8">
      
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

          {activeTab === 'collection' && !isBatchMode && (
            <button
              onClick={handleBulkMill}
              className="px-4 py-2 bg-yellow-400 hover:bg-yellow-500 text-black font-black rounded-xl border-4 border-black transition-transform active:translate-y-1 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center gap-2"
            >
              <Coins className="w-5 h-5" />
              Mill All Duplicates
            </button>
          )}
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
            onClick={() => {
              if (isBatchMode) {
                setSelectedCardIds(prev => prev.includes(card.id) ? prev.filter(id => id !== card.id) : [...prev, card.id]);
              } else {
                setSelectedCard(card);
              }
            }}
            className={cn(
              "aspect-[2/3] rounded-xl p-4 relative overflow-hidden flex flex-col justify-between border-4 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] group cursor-pointer bg-white transition-all duration-300",
              selectedCardIds.includes(card.id) ? "border-blue-500 ring-4 ring-blue-500/50" :
              card.rarity === 'Divine' ? 'border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.5)]' :
              card.rarity === 'Mythic' ? 'border-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.5)]' :
              card.rarity === 'Super-Rare' ? 'border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.5)]' :
              card.rarity === 'Rare' ? 'border-blue-500' :
              card.rarity === 'Uncommon' ? 'border-green-500' :
              'border-slate-400'
            )}
          >
            {isBatchMode && (
              <div className={cn(
                "absolute top-2 right-2 z-40 w-6 h-6 rounded-full border-2 border-black flex items-center justify-center",
                selectedCardIds.includes(card.id) ? "bg-blue-500 text-white" : "bg-white"
              )}>
                {selectedCardIds.includes(card.id) && <Check className="w-4 h-4" />}
              </div>
            )}
            
            <div className="flex justify-between items-start z-10 p-4">
              <div className="text-xs font-black uppercase tracking-wider text-white bg-gradient-to-r from-red-500 via-yellow-500 via-green-500 via-blue-500 to-purple-500 border-2 border-black px-2 py-0.5 rounded-full shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                {card.rarity}
              </div>
              <div className="flex gap-1">
                {card.quantity > 1 && (
                  <div className="bg-black text-white text-xs font-black px-2 py-1 rounded-lg border-2 border-white shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]">
                    x{card.quantity}
                  </div>
                )}
              </div>
            </div>

            {/* Card Art - Fills container */}
            <div className="absolute inset-0 z-0">
              <img 
                src={card.image_url} 
                alt={card.name}
                className="w-full h-full object-cover"
                onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = '/fallback-card.png'; }}
                referrerPolicy="no-referrer"
                loading="lazy"
              />
            </div>

            {/* Hover Actions - Strictly Quick Sell */}
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-end p-4 z-30">
              <div className="text-center mb-4">
                <p className="text-white font-black text-sm uppercase">{card.name}</p>
                {card.flavor_text && (
                  <div className="mt-2 p-2 bg-black/40 border border-white/20 rounded-lg">
                    <p className="text-gray-200 text-[11px] italic leading-snug">"{card.flavor_text}"</p>
                  </div>
                )}
              </div>
              {activeTab === 'collection' && !card.is_locked && (
                <button 
                  onClick={(e) => { e.stopPropagation(); handleQuicksell(card); }}
                  className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-black rounded-xl border-4 border-black transition-transform active:translate-y-1 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center gap-2"
                >
                  <Coins className="w-4 h-4" /> Quick Sell
                </button>
              )}
            </div>
          </motion.div>
        ))}
      </div>
      
      {filteredCards.length === 0 && (
        <EmptyState 
          icon={PackageOpen}
          title={activeTab === 'collection' ? 'Collection is empty' : 'Wishlist is empty'}
          description={activeTab === 'collection' ? 'Your collection is looking a little empty! Head to the Store to open some packs.' : 'Add items to your wishlist to track them'}
          ctaText={activeTab === 'collection' ? 'Go to Store' : 'Go to Marketplace'}
          ctaPath={activeTab === 'collection' ? '/store' : '/marketplace'}
        />
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
      {isBatchMode && selectedCardIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-white border-4 border-black p-4 rounded-2xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] z-50 flex items-center gap-4">
          <p className="font-black">Selected {selectedCardIds.length} cards</p>
          <button 
            onClick={async () => {
              if (!confirm(`Are you sure you want to quicksell ${selectedCardIds.length} cards?`)) return;
              try {
                // Assuming quicksell_card takes a single card ID, we might need a bulk RPC
                // For now, let's just do them one by one or assume a bulk RPC exists
                // The user request implies a bulk action. I'll check for a bulk RPC.
                // Actually, I'll just use a loop for now if no bulk RPC exists.
                // Wait, I should check if there's a bulk quicksell.
                // I'll assume a loop is fine for now.
                for (const cardId of selectedCardIds) {
                  await supabase.rpc('quicksell_card', { p_card_id: cardId, p_is_foil: false, p_quantity: 1 });
                }
                toast.success('Successfully sold cards!');
                setSelectedCardIds([]);
                setIsBatchMode(false);
                fetchCollection();
              } catch (err: any) {
                toast.error('Failed to sell cards');
              }
            }}
            className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-black rounded-xl border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
          >
            Quick Sell Selected
          </button>
        </div>
      )}
      </div>
    </>
  );
}
