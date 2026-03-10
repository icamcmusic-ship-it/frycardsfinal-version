import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useProfileStore } from '../stores/profileStore';
import { Loader2, Search, Filter, Lock, Unlock, Zap, LayoutGrid, Coins, Star, PackageOpen, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { motion } from 'motion/react';
import { cn, getRarityStyles } from '../lib/utils';
import { EmptyState } from '../components/EmptyState';
import { CardDisplay } from '../components/CardDisplay';

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
      <div className="sticky top-16 z-30 bg-[var(--bg)]/90 backdrop-blur-sm py-4 border-b-2 border-[var(--border)] -mx-4 px-4">
        <div className="max-w-7xl mx-auto flex gap-2 overflow-x-auto pb-1 scrollbar-hide flex-nowrap items-center">
          <button
            onClick={() => setIsBatchMode(!isBatchMode)}
            className={cn(
              "shrink-0 px-4 py-2 font-black rounded-xl border-4 border-[var(--border)] transition-transform active:translate-y-1 shadow-[4px_4px_0px_0px_var(--border)]",
              isBatchMode ? "bg-red-500 text-white" : "bg-[var(--surface)] text-[var(--text)]"
            )}
          >
            {isBatchMode ? 'Cancel Selection' : 'Select Multiple'}
          </button>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="shrink-0 px-4 py-2 bg-[var(--surface)] border-4 border-[var(--border)] rounded-xl text-[var(--text)] font-bold focus:outline-none shadow-[4px_4px_0px_0px_var(--border)]"
          >
            <option value="rarity">Sort by Rarity</option>
            <option value="newest">Sort by Newest</option>
            <option value="price">Sort by Price</option>
          </select>
          
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="shrink-0 w-48 px-4 py-2 bg-[var(--surface)] border-4 border-[var(--border)] rounded-xl text-[var(--text)] font-bold placeholder-slate-400 focus:outline-none shadow-[4px_4px_0px_0px_var(--border)]"
          />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="shrink-0 px-4 py-2 bg-[var(--surface)] border-4 border-[var(--border)] rounded-xl text-[var(--text)] font-bold appearance-none focus:outline-none shadow-[4px_4px_0px_0px_var(--border)]"
          >
            <option value="all">All Rarities</option>
            <option value="common">Common</option>
            <option value="uncommon">Uncommon</option>
            <option value="rare">Rare</option>
            <option value="super-rare">Super-Rare</option>
            <option value="mythic">Mythic</option>
            <option value="divine">Divine</option>
          </select>
        </div>
      </div>

      <div className="space-y-8 pt-8">
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-[var(--text)] tracking-tight uppercase">Collection</h1>
          <p className="text-slate-600 font-bold mt-1">{cards.length} cards collected</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex bg-[var(--surface)] border-4 border-[var(--border)] rounded-xl p-1 shadow-[4px_4px_0px_0px_var(--border)]">
            <button
              onClick={() => setActiveTab('collection')}
              className={cn(
                "px-6 py-2 rounded-lg font-black text-sm uppercase transition-colors",
                activeTab === 'collection' ? "bg-[var(--text)] text-[var(--surface)]" : "text-slate-600 hover:bg-slate-100"
              )}
            >
              Collection
            </button>
            <button
              onClick={() => setActiveTab('wishlist')}
              className={cn(
                "px-6 py-2 rounded-lg font-black text-sm uppercase transition-colors",
                activeTab === 'wishlist' ? "bg-[var(--text)] text-[var(--surface)]" : "text-slate-600 hover:bg-slate-100"
              )}
            >
              Wishlist
            </button>
          </div>

          {activeTab === 'collection' && !isBatchMode && (
            <button
              onClick={handleBulkMill}
              className="px-4 py-2 bg-yellow-400 hover:bg-yellow-500 text-black font-black rounded-xl border-4 border-[var(--border)] transition-transform active:translate-y-1 shadow-[4px_4px_0px_0px_var(--border)] flex items-center gap-2"
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
              "relative overflow-hidden group cursor-pointer transition-all duration-300",
              selectedCardIds.includes(card.id) ? "ring-4 ring-blue-500/50 rounded-xl" : ""
            )}
          >
            {isBatchMode && (
              <div className={cn(
                "absolute top-2 right-2 z-40 w-6 h-6 rounded-full border-2 border-[var(--border)] flex items-center justify-center",
                selectedCardIds.includes(card.id) ? "bg-blue-500 text-white" : "bg-[var(--surface)]"
              )}>
                {selectedCardIds.includes(card.id) && <Check className="w-4 h-4" />}
              </div>
            )}
            
            <CardDisplay card={card} />

            {/* Hover Actions - Strictly Quick Sell */}
            <div className="absolute inset-x-0 bottom-0 bg-black/85 backdrop-blur-sm translate-y-full group-hover:translate-y-0 transition-transform duration-300 p-3 z-30 rounded-b-xl">
              <p className="text-white font-black text-xs uppercase tracking-wide">{card.name}</p>
              <p className="text-gray-300 text-[10px] font-bold">{card.rarity} · {card.card_type}</p>
              {card.element && <p className="text-blue-300 text-[10px]">{card.element}</p>}
              {activeTab === 'collection' && !card.is_locked && (
                <button 
                  onClick={(e) => { e.stopPropagation(); handleQuicksell(card); }}
                  className="mt-2 w-full py-1 bg-emerald-500 text-white font-black rounded text-[10px] uppercase border border-black"
                >
                  💰 Quick Sell
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
          <div className="bg-[var(--surface)] border-4 border-[var(--border)] rounded-2xl p-6 max-w-2xl w-full shadow-[8px_8px_0px_0px_var(--border)]" onClick={e => e.stopPropagation()}>
            <div className="flex flex-col md:flex-row gap-6">
              {/* Left: Large card art */}
              <div className="w-full md:w-64 shrink-0 aspect-[3/4] rounded-xl overflow-hidden border-4 border-[var(--border)] bg-gray-200">
                {selectedCard.is_video
                  ? <video src={selectedCard.image_url} autoPlay muted loop className="w-full h-full object-cover" />
                  : <img src={selectedCard.image_url} alt={selectedCard.name} className="w-full h-full object-cover" />}
              </div>
              
              {/* Right: Stats */}
              <div className="flex-1 space-y-4">
                <div>
                  <h2 className="text-2xl font-black uppercase text-[var(--text)]">{selectedCard.name}</h2>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="inline-block text-xs font-black px-2 py-1 rounded border-2 border-[var(--border)] bg-gray-100 text-black">{selectedCard.rarity}</span>
                    <span className="text-sm font-bold text-slate-500">{selectedCard.card_type}{selectedCard.sub_type ? ` · ${selectedCard.sub_type}` : ''}</span>
                  </div>
                  {selectedCard.element && <p className="text-sm font-bold text-blue-600 mt-1">{selectedCard.element}</p>}
                  {selectedCard.flavor_text && <p className="text-sm italic text-slate-400 mt-2">"{selectedCard.flavor_text}"</p>}
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  {selectedCard.hp != null && <div className="bg-red-50 border-2 border-red-300 rounded-lg p-2"><p className="text-xs font-bold text-slate-500">HP</p><p className="font-black text-black">{selectedCard.hp}</p></div>}
                  {selectedCard.attack != null && <div className="bg-orange-50 border-2 border-orange-300 rounded-lg p-2"><p className="text-xs font-bold text-slate-500">ATK</p><p className="font-black text-black">{selectedCard.attack}</p></div>}
                  {selectedCard.defense != null && <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-2"><p className="text-xs font-bold text-slate-500">DEF</p><p className="font-black text-black">{selectedCard.defense}</p></div>}
                </div>

                {selectedCard.ability_text && (
                  <div className="p-3 bg-purple-50 border-2 border-purple-300 rounded-lg">
                    <p className="text-xs font-black text-purple-700 uppercase mb-1">{selectedCard.ability_type || 'Ability'}</p>
                    <p className="text-sm font-bold text-black">{selectedCard.ability_text}</p>
                  </div>
                )}

                {selectedCard.keywords?.length > 0 && (
                  <div className="flex gap-2 flex-wrap">
                    {selectedCard.keywords.map((kw: string) => (
                      <span key={kw} className="text-xs font-black bg-gray-100 border border-[var(--border)] rounded px-2 py-0.5 text-black">{kw}</span>
                    ))}
                  </div>
                )}

                {/* Foil info */}
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="bg-gray-50 border border-[var(--border)] rounded p-2 text-center">
                    <p className="text-xs text-slate-500">Normal</p>
                    <p className="font-black text-black">x{selectedCard.quantity ?? 0}</p>
                  </div>
                  {selectedCard.foil_quantity > 0 && (
                    <div className="bg-yellow-50 border border-yellow-400 rounded p-2 text-center">
                      <p className="text-xs text-yellow-600">✨ Foil</p>
                      <p className="font-black text-black">x{selectedCard.foil_quantity}</p>
                    </div>
                  )}
                </div>

                <button onClick={() => setSelectedCard(null)} className="w-full py-3 bg-black text-white font-black rounded-xl border-4 border-black hover:bg-gray-800 transition-colors">Close</button>
              </div>
            </div>
          </div>
        </div>
      )}
      {isBatchMode && selectedCardIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[var(--surface)] border-4 border-[var(--border)] p-4 rounded-2xl shadow-[8px_8px_0px_0px_var(--border)] z-50 flex items-center gap-4">
          <p className="font-black text-[var(--text)]">Selected {selectedCardIds.length} cards</p>
          <button 
            onClick={async () => {
              if (!confirm(`Are you sure you want to quicksell ${selectedCardIds.length} cards?`)) return;
              try {
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
            className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-black rounded-xl border-4 border-[var(--border)] shadow-[4px_4px_0px_0px_var(--border)]"
          >
            Quick Sell Selected
          </button>
        </div>
      )}
      </div>
    </>
  );
}
