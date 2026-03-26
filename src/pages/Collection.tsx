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
import { CollectionCard } from '../components/CollectionCard';
import { ConfirmModal } from '../components/ConfirmModal';

export function Collection() {
  const { profile } = useProfileStore();
  const [cards, setCards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'collection' | 'wishlist'>('collection');
  const [wishlist, setWishlist] = useState<any[]>([]);
  const [selectedCard, setSelectedCard] = useState<any>(null);
  const [isListingModalOpen, setIsListingModalOpen] = useState(false);
  const [cardToList, setCardToList] = useState<any>(null);
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [selectedCardIds, setSelectedCardIds] = useState<string[]>([]);
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    variant?: 'danger' | 'warning' | 'info';
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });
  const [sortBy, setSortBy] = useState<'rarity' | 'newest' | 'price'>('rarity');
  const [elementType, setElementType] = useState<string>('all');
  const [showFoilsOnly, setShowFoilsOnly] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [viewSize, setViewSize] = useState<'normal' | 'large'>('large');
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const PAGE_SIZE = 20;

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (profile) {
      setOffset(0);
      if (activeTab === 'collection') {
        fetchCollection(false, 0);
      } else {
        fetchWishlist();
      }
      fetchStats();
    }
  }, [profile, activeTab, sortBy, filter, elementType, debouncedSearch, showFoilsOnly]);

  const fetchStats = async () => {
    try {
      const { data } = await supabase.rpc('get_my_collection_stats');
      if (data) setStats(data);
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  const fetchCollection = async (isLoadMore = false, currentOffset?: number) => {
    try {
      const targetOffset = currentOffset !== undefined ? currentOffset : offset;
      
      if (!isLoadMore) {
        setLoading(true);
        setHasMore(true);
      } else {
        setLoadingMore(true);
      }

      const rarityForApi = filter === 'all' ? null : 
        filter.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('-');
        
      const { data, error } = await supabase.rpc('get_user_collection', {
        p_user_id: profile?.id,
        p_rarity: rarityForApi,
        p_sort_by: sortBy,
        p_element_type: elementType === 'all' ? null : elementType,
        p_limit: PAGE_SIZE,
        p_offset: targetOffset,
        p_search: debouncedSearch || null
      });
      
      if (error) throw error;
      
      const fetchedCards = data || [];
      if (isLoadMore) {
        setCards(prev => [...prev, ...fetchedCards]);
      } else {
        setCards(fetchedCards);
      }

      setHasMore(fetchedCards.length === PAGE_SIZE);
      setOffset(targetOffset + fetchedCards.length);

      // Mark unseen cards as seen
      const unseenCardIds = fetchedCards.filter((c: any) => c.is_new === true).map((c: any) => c.id);
      if (unseenCardIds.length > 0) {
        await supabase.rpc('mark_cards_seen', { p_card_ids: unseenCardIds });
      }
    } catch (err) {
      console.error('Error fetching collection:', err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  // Infinite scroll listener
  useEffect(() => {
    const handleScroll = () => {
      if (window.innerHeight + document.documentElement.scrollTop >= document.documentElement.offsetHeight - 500) {
        if (hasMore && !loadingMore && activeTab === 'collection') {
          fetchCollection(true);
        }
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [hasMore, loadingMore, activeTab, offset]);

  const fetchWishlist = async () => {
    try {
      setLoading(true);
      const rarityForApi = filter === 'all' ? null : 
        filter.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('-');
        
      const { data, error } = await supabase.rpc('get_wishlist', {
        p_rarity: rarityForApi
      });
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
        if (c.user_card_id === userCardId) {
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
    setConfirmConfig({
      isOpen: true,
      title: 'Mill Duplicates',
      message: `Are you sure you want to mill ${duplicates} duplicate(s) of ${card.name}? You will receive ${totalGold} Gold.`,
      variant: 'warning',
      onConfirm: async () => {
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
      }
    });
  };

  const handleQuicksell = async (card: any) => {
    const baseValue = { Common: 10, Uncommon: 25, Rare: 100, 'Super-Rare': 250, Mythic: 500, Divine: 1000 }[card.rarity] ?? 10;
    const value = card.is_foil ? baseValue * 3 : baseValue;
    
    setConfirmConfig({
      isOpen: true,
      title: 'Quicksell Card',
      message: `Quicksell ${card.name} for ${value} Gold?`,
      variant: 'danger',
      onConfirm: async () => {
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
      }
    });
  };

  const handleBulkMill = async () => {
    setConfirmConfig({
      isOpen: true,
      title: 'Bulk Mill Duplicates',
      message: 'Are you sure you want to mill ALL duplicate cards? This cannot be undone.',
      variant: 'danger',
      onConfirm: async () => {
        try {
          const { data, error } = await supabase.rpc('mill_bulk_duplicates', { p_card_ids: null });
          if (error) throw error;
          
          fetchCollection(); // Refresh
          
          toast.success(`Successfully milled ${data.cards_milled} cards for ${data.gold_earned} Gold!`, { icon: '🪙' });
        } catch (err: any) {
          toast.error(err.message || 'Failed to bulk mill');
        }
      }
    });
  };

  const filteredCards = activeTab === 'collection' ? cards : wishlist;

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="h-10 w-48 bg-slate-200 animate-pulse rounded-lg mb-2"></div>
            <div className="h-5 w-32 bg-slate-200 animate-pulse rounded-lg"></div>
          </div>
        </div>
        <div className={cn("grid gap-8", viewSize === 'normal' ? "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4" : "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4")}>
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
              {stats.foil_cards > 0 && (
                <p className="text-xs font-black text-yellow-600 mt-1 uppercase tracking-wider">✨ {stats.foil_cards} Foil Cards</p>
              )}
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
          <select
            value={elementType}
            onChange={(e) => setElementType(e.target.value)}
            className="shrink-0 px-4 py-2 bg-[var(--surface)] border-4 border-[var(--border)] rounded-xl text-[var(--text)] font-bold appearance-none focus:outline-none shadow-[4px_4px_0px_var(--border)]"
          >
            <option value="all">All Elements</option>
            <option value="fire">Fire</option>
            <option value="water">Water</option>
            <option value="earth">Earth</option>
            <option value="air">Air</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
          <button
            onClick={() => setShowFoilsOnly(!showFoilsOnly)}
            className={cn(
              "shrink-0 px-4 py-2 font-black rounded-xl border-4 border-[var(--border)] transition-transform active:translate-y-1 shadow-[4px_4px_0px_0px_var(--border)]",
              showFoilsOnly ? "bg-yellow-400 text-black" : "bg-[var(--surface)] text-[var(--text)]"
            )}
          >
            {showFoilsOnly ? '✨ Foils Only' : 'Show All'}
          </button>
          <button
            onClick={() => setViewSize(prev => prev === 'normal' ? 'large' : 'normal')}
            className="shrink-0 px-4 py-2 bg-[var(--surface)] border-4 border-[var(--border)] rounded-xl text-[var(--text)] font-bold shadow-[4px_4px_0px_0px_var(--border)] flex items-center gap-2"
          >
            <LayoutGrid className="w-5 h-5" />
            {viewSize === 'normal' ? 'Large Grid' : 'Normal Grid'}
          </button>
        </div>
      </div>

      <div className={cn("grid gap-8", viewSize === 'normal' ? "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4" : "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4")}>
        {filteredCards.map((card) => {
          const selectionId = card.user_card_id || card.id;
          return (
          <CollectionCard 
            key={card.id}
            card={card}
            isBatchMode={isBatchMode}
            isSelected={selectedCardIds.includes(selectionId)}
            activeTab={activeTab}
            onSelect={() => {
              if (isBatchMode) {
                setSelectedCardIds(prev => prev.includes(selectionId) ? prev.filter(id => id !== selectionId) : [...prev, selectionId]);
              } else {
                setSelectedCard(card);
              }
            }}
            onToggleLock={(e: any) => { e.stopPropagation(); handleToggleLock(card.id); }}
            onQuicksell={(e: any) => { e.stopPropagation(); handleQuicksell(card); }}
            onList={(e: any) => { 
              e.stopPropagation(); 
              setCardToList(card);
              setIsListingModalOpen(true);
            }}
            onToggleWishlist={(e: any) => { e.stopPropagation(); handleToggleWishlist(card.id); }}
          />
        )})}
      </div>
      
      {loadingMore && (
        <div className="flex justify-center py-8">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      )}

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
            onClick={() => {
              setConfirmConfig({
                isOpen: true,
                title: 'Quicksell Selected',
                message: `Are you sure you want to quicksell ${selectedCardIds.length} cards?`,
                variant: 'danger',
                onConfirm: async () => {
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
                }
              });
            }}
            className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-black rounded-xl border-4 border-[var(--border)] shadow-[4px_4px_0px_0px_var(--border)]"
          >
            Quick Sell Selected
          </button>
        </div>
      )}
      <ConfirmModal
        isOpen={confirmConfig.isOpen}
        onClose={() => setConfirmConfig({ ...confirmConfig, isOpen: false })}
        onConfirm={confirmConfig.onConfirm}
        title={confirmConfig.title}
        message={confirmConfig.message}
        variant={confirmConfig.variant}
      />
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
