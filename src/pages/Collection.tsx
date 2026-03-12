import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useProfileStore } from '../stores/profileStore';
import { Loader2, Search, Filter, Lock, Unlock, Zap, LayoutGrid, Coins, Star, PackageOpen, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { motion } from 'motion/react';
import { cn, getRarityStyles } from '../lib/utils';
import { EmptyState } from '../components/EmptyState';
import { CardDisplay } from '../components/CardDisplay';
import { CardSkeleton } from '../components/CardSkeleton';
import { CreateListingModal } from '../components/CreateListingModal';
import { Card3DModal } from '../components/Card3DModal';

export function Collection() {
  const { profile } = useProfileStore();
  const [cards, setCards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [visibleCount, setVisibleCount] = useState(20);

  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'collection' | 'wishlist'>('collection');
  const [wishlist, setWishlist] = useState<any[]>([]);
  const [selectedCard, setSelectedCard] = useState<any>(null);
  const [isListingModalOpen, setIsListingModalOpen] = useState(false);
  const [cardToList, setCardToList] = useState<any>(null);
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [selectedCardIds, setSelectedCardIds] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<'rarity' | 'newest' | 'price'>('rarity');
  const [elementType, setElementType] = useState<string>('all');
  const [stats, setStats] = useState<any>(null);
  const [viewSize, setViewSize] = useState<'normal' | 'large'>('normal');

  useEffect(() => {
    if (profile) {
      if (activeTab === 'collection') {
        fetchCollection();
      } else {
        fetchWishlist();
      }
      fetchStats();
    }
  }, [profile, activeTab]);

  const fetchStats = async () => {
    try {
      const { data } = await supabase.rpc('get_my_collection_stats');
      if (data) setStats(data);
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  const fetchCollection = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('get_user_collection', {
        p_user_id: profile?.id,
        p_rarity: null, // Fetch all, filter client-side
        p_sort_by: 'newest', // Fetch all, sort client-side
        p_limit: 5000,
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

  // Infinite scroll listener
  useEffect(() => {
    const handleScroll = () => {
      if (window.innerHeight + document.documentElement.scrollTop >= document.documentElement.offsetHeight - 100) {
        setVisibleCount(prev => prev + 20);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const fetchWishlist = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('get_wishlist');
      if (error) throw error;
      setWishlist((data || []).map((c: any) => ({
        ...c,
        quantity: c.is_owned ? 1 : 0,
        foil_quantity: 0,
        is_locked: false,
        is_new: false,
      })));
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
        toast.success('Wishlist updated!', { icon: '✨' });
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
      
      setCards(cards.map(c => {
        if (c.id === userCardId) {
          const newLockedState = !c.is_locked;
          toast.success(newLockedState ? 'Card locked!' : 'Card unlocked!');
          return { ...c, is_locked: newLockedState };
        }
        return c;
      }));
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
    const baseValue = { Common: 10, Uncommon: 25, Rare: 100, 'Super-Rare': 250, Mythic: 500, Divine: 1000 }[card.rarity] ?? 10;
    const value = card.is_foil ? baseValue * 3 : baseValue;
    
    if (!confirm(`Quicksell ${card.name} for ${value} Gold?`)) return;
    
    // Optimistic update
    const previousCards = [...cards];
    setCards(cards.filter(c => c.id !== card.id));
    
    if (profile) {
      useProfileStore.getState().setProfile({
        ...profile,
        gold_balance: profile.gold_balance + value
      });
    }

    const { data, error } = await supabase.rpc('quicksell_card', {
      p_card_id: card.id,
      p_is_foil: card.is_foil || false,
      p_quantity: 1,
    });
    
    if (error) { 
      toast.error(error.message); 
      // Revert optimistic update
      setCards(previousCards);
      if (profile) {
        useProfileStore.getState().setProfile(profile);
      }
      return; 
    }
    
    toast.success(`Sold for ${(data as any).gold_earned} Gold!`, { icon: '🪙' });
    fetchStats(); // Update stats in background
  };

  const handleBulkMill = async () => {
    if (!confirm('Are you sure you want to mill ALL duplicate cards? This cannot be undone.')) return;
    
    try {
      const { data, error } = await supabase.rpc('mill_bulk_duplicates');
      if (error) throw error;
      
      fetchCollection(); // Refresh
      
      toast.success(`Successfully milled ${data.cards_milled} cards for ${data.gold_earned} Gold!`, { icon: '🪙' });
    } catch (err: any) {
      toast.error(err.message || 'Failed to bulk mill');
    }
  };

  useEffect(() => {
    setVisibleCount(20);
  }, [filter, search, sortBy, activeTab, elementType]);

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
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="h-10 w-48 bg-slate-200 animate-pulse rounded-lg mb-2"></div>
            <div className="h-5 w-32 bg-slate-200 animate-pulse rounded-lg"></div>
          </div>
        </div>
        <div className={cn("grid gap-8", viewSize === 'normal' ? "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5" : "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4")}>
          {Array.from({ length: 10 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {stats && (
        <div className="bg-[var(--surface)] border-4 border-[var(--border)] rounded-2xl p-6 shadow-[8px_8px_0px_0px_var(--border)] mb-8">
          <div className="flex justify-between items-end mb-4">
            <div>
              <p className="text-sm font-black uppercase text-slate-500 mb-1">Collection Completion</p>
              <h2 className="text-3xl font-black text-[var(--text)]">
                {stats.unique_cards} <span className="text-lg text-slate-400">/ {stats.total_possible}</span>
              </h2>
            </div>
            <div className="text-right">
              <p className="text-3xl font-black text-blue-500">{Math.round(stats.completion_pct ?? 0)}%</p>
            </div>
          </div>
          <div className="h-4 bg-[var(--bg)] rounded-full border-4 border-[var(--border)] overflow-hidden shadow-[inner_0_2px_4px_rgba(0,0,0,0.1)]">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${stats.completion_pct ?? 0}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="h-full bg-gradient-to-r from-blue-500 to-cyan-400"
            />
          </div>
        </div>
      )}

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
            <>
              <button
                onClick={async () => {
                  await supabase.rpc('mark_cards_seen');
                  setCards(prev => prev.map(c => ({ ...c, is_new: false })));
                  toast.success('All cards marked as seen!', { icon: '✨' });
                }}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-black rounded-xl border-4 border-[var(--border)] transition-transform active:translate-y-1 shadow-[4px_4px_0px_0px_var(--border)] flex items-center gap-2"
              >
                <Check className="w-5 h-5" />
                Clear "New"
              </button>
              <button
                onClick={handleBulkMill}
                className="px-4 py-2 bg-yellow-400 hover:bg-yellow-500 text-black font-black rounded-xl border-4 border-[var(--border)] transition-transform active:translate-y-1 shadow-[4px_4px_0px_0px_var(--border)] flex items-center gap-2"
              >
                <Coins className="w-5 h-5" />
                Mill All Duplicates
              </button>
            </>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {['all', 'common', 'uncommon', 'rare', 'super-rare', 'mythic', 'divine'].map((r) => (
          <button
            key={r}
            onClick={() => setFilter(r)}
            className={cn(
              "px-4 py-1.5 rounded-full font-black text-xs uppercase border-2 transition-all",
              filter === r 
                ? "bg-[var(--text)] text-[var(--surface)] border-[var(--text)]" 
                : "bg-[var(--surface)] text-slate-500 border-[var(--border)] hover:border-slate-400"
            )}
          >
            {r}
          </button>
        ))}
      </div>

      <div className="sticky top-16 z-30 bg-[var(--bg)]/90 backdrop-blur-sm py-4 border-b-2 border-[var(--border)] -mx-4 px-4 md:-mx-8 md:px-8">
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
            className="shrink-0 px-4 py-2 bg-[var(--surface)] border-4 border-[var(--border)] rounded-xl text-[var(--text)] font-bold appearance-none focus:outline-none shadow-[4px_4px_0px_var(--border)]"
          >
            <option value="all">All Rarities</option>
            <option value="common">Common</option>
            <option value="uncommon">Uncommon</option>
            <option value="rare">Rare</option>
            <option value="super-rare">Super-Rare</option>
            <option value="mythic">Mythic</option>
            <option value="divine">Divine</option>
          </select>
          <button
            onClick={() => setViewSize(prev => prev === 'normal' ? 'large' : 'normal')}
            className="shrink-0 px-4 py-2 bg-[var(--surface)] border-4 border-[var(--border)] rounded-xl text-[var(--text)] font-bold shadow-[4px_4px_0px_0px_var(--border)] flex items-center gap-2"
          >
            <LayoutGrid className="w-5 h-5" />
            {viewSize === 'normal' ? 'Large Grid' : 'Normal Grid'}
          </button>
        </div>
      </div>

      <div className={cn("grid gap-8", viewSize === 'normal' ? "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5" : "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4")}>
        {filteredCards.slice(0, visibleCount).map((card) => (
          <CollectionCard 
            key={card.id}
            card={card}
            isBatchMode={isBatchMode}
            isSelected={selectedCardIds.includes(card.id)}
            activeTab={activeTab}
            onSelect={() => {
              if (isBatchMode) {
                setSelectedCardIds(prev => prev.includes(card.id) ? prev.filter(id => id !== card.id) : [...prev, card.id]);
              } else {
                setSelectedCard(card);
              }
            }}
            onToggleLock={(e) => { e.stopPropagation(); handleToggleLock(card.id); }}
            onQuicksell={(e) => { e.stopPropagation(); handleQuicksell(card); }}
            onList={(e) => { 
              e.stopPropagation(); 
              setCardToList(card);
              setIsListingModalOpen(true);
            }}
            onToggleWishlist={(e) => { e.stopPropagation(); handleToggleWishlist(card.id); }}
          />
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
        <Card3DModal
          card={selectedCard}
          cardBackUrl={profile?.card_back_url || null}
          onClose={() => setSelectedCard(null)}
        />
      )}
      {isBatchMode && selectedCardIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[var(--surface)] border-4 border-[var(--border)] p-4 rounded-2xl shadow-[8px_8px_0px_0px_var(--border)] z-50 flex items-center gap-4">
          <p className="font-black text-[var(--text)]">Selected {selectedCardIds.length} cards</p>
          <button 
            onClick={async () => {
              if (!confirm(`Are you sure you want to quicksell ${selectedCardIds.length} cards?`)) return;
              try {
                const { data, error } = await supabase.rpc('mill_bulk_duplicates', {
                  p_card_ids: selectedCardIds
                });
                if (error) throw error;
                toast.success(`Sold ${data.count} cards for ${data.gold_earned} gold!`, { icon: '🪙' });
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
      <CreateListingModal 
        isOpen={isListingModalOpen} 
        onClose={() => {
          setIsListingModalOpen(false);
          setCardToList(null);
        }} 
        onSuccess={fetchCollection}
        initialCard={cardToList}
      />
    </div>
  );
}

function CollectionCard({ card, isBatchMode, isSelected, activeTab, onSelect, onToggleLock, onQuicksell, onList, onToggleWishlist }: any) {
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const tiltX = ((y - centerY) / centerY) * -10;
    const tiltY = ((x - centerX) / centerX) * 10;
    setTilt({ x: tiltX, y: tiltY });
  };

  const handleMouseLeave = () => {
    setTilt({ x: 0, y: 0 });
  };

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1, rotateX: tilt.x, rotateY: tilt.y }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={onSelect}
      style={{ perspective: 1000 }}
      className={cn(
        "relative overflow-hidden group cursor-pointer transition-all duration-300",
        isSelected ? "ring-4 ring-blue-500/50 rounded-xl" : ""
      )}
    >
      {isBatchMode && (
        <div className={cn(
          "absolute top-2 right-2 z-40 w-6 h-6 rounded-full border-2 border-[var(--border)] flex items-center justify-center",
          isSelected ? "bg-blue-500 text-white" : "bg-[var(--surface)]"
        )}>
          {isSelected && <Check className="w-4 h-4" />}
        </div>
      )}
      
      <CardDisplay card={card} />

      {/* Hover Actions */}
      <div className="absolute inset-x-0 bottom-0 bg-black/85 backdrop-blur-sm translate-y-full group-hover:translate-y-0 transition-transform duration-300 p-3 z-30 rounded-b-xl">
        <p className="text-white font-black text-xs uppercase tracking-wide">{card.name}</p>
        <p className="text-gray-300 text-[10px] font-bold">{card.rarity} · {card.card_type}</p>
        {card.element && <p className="text-blue-300 text-[10px]">{card.element}</p>}
        <div className="flex gap-2 mt-2">
          {activeTab === 'collection' && (
            <button 
              onClick={onToggleLock}
              className={cn(
                "flex-1 py-1 font-black rounded text-[10px] uppercase border border-black flex items-center justify-center gap-1",
                card.is_locked ? "bg-slate-600 text-white" : "bg-yellow-400 text-black"
              )}
            >
              {card.is_locked ? <><Lock className="w-3 h-3" /> Unlock</> : <><Unlock className="w-3 h-3" /> Lock</>}
            </button>
          )}
          {activeTab === 'collection' && !card.is_locked && (
            <button 
              onClick={onQuicksell}
              className="flex-1 py-1 bg-emerald-500 text-white font-black rounded text-[10px] uppercase border border-black"
            >
              💰 Sell
            </button>
          )}
          {activeTab === 'collection' && !card.is_locked && (
            <button 
              onClick={onList}
              className="flex-1 py-1 bg-blue-500 text-white font-black rounded text-[10px] uppercase border border-black"
            >
              📋 List
            </button>
          )}
          {activeTab === 'wishlist' && (
            <button
              onClick={onToggleWishlist}
              className="flex-1 py-1 bg-red-500 text-white font-black rounded text-[10px] uppercase border border-black"
            >
              Remove
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
