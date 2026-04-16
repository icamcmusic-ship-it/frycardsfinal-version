import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useProfileStore } from '../stores/profileStore';
import { Loader2, Search, Filter, Lock, Unlock, Zap, LayoutGrid, Coins, Star, PackageOpen, Check, Trophy } from 'lucide-react';
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
import { SetProgress } from '../components/SetProgress';

export function Collection() {
  const { profile } = useProfileStore();
  const navigate = useNavigate();
  const [cards, setCards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [filter, setFilter] = useState(() => sessionStorage.getItem('col_filter') || 'all');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'collection' | 'wishlist' | 'sets'>('collection');
  const [wishlist, setWishlist] = useState<any[]>([]);
  const [sets, setSets] = useState<any[]>([]);
  const [loadingSets, setLoadingSets] = useState(false);
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
  const [sortBy, setSortBy] = useState<'rarity' | 'newest' | 'price'>(() =>
    (sessionStorage.getItem('col_sort') as any) || 'rarity'
  );
  const [elementType, setElementType] = useState<string>(() => sessionStorage.getItem('col_element') || 'all');
  const [cardType, setCardType] = useState<string>(() => sessionStorage.getItem('col_card_type') || 'all');
  const [selectedSetId, setSelectedSetId] = useState<string>(() => sessionStorage.getItem('col_set_id') || 'all');
  const [foilFilter, setFoilFilter] = useState<'all' | 'foil' | 'non-foil'>(() => 
    (sessionStorage.getItem('col_foil_filter') as any) || 'all'
  );
  const [stats, setStats] = useState<any>(null);
  const [viewSize, setViewSize] = useState<'normal' | 'large'>(() => 
    (localStorage.getItem('col_view_size') as any) || 'normal'
  );
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const offsetRef = useRef(0);
  const [wishlistCardIds, setWishlistCardIds] = useState<Set<string>>(new Set());
  const PAGE_SIZE = 20;

  useEffect(() => {
    if (profile) {
      fetchSets();
      // Increment mission progress for viewing collection
      supabase.rpc('increment_mission_progress', { p_mission_type: 'view_collection', p_amount: 1 })
        .then(({ error }) => { if (error) console.error('Error incrementing mission progress:', error); });
    }
  }, [profile]);

  const fetchSets = async () => {
    setLoadingSets(true);
    try {
      const { data, error } = await supabase.rpc('get_set_progress');
      if (error) throw error;
      setSets(data || []);
    } catch (err) {
      console.error('Error fetching sets:', err);
    } finally {
      setLoadingSets(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => { sessionStorage.setItem('col_filter', filter); }, [filter]);
  useEffect(() => { sessionStorage.setItem('col_sort', sortBy); }, [sortBy]);
  useEffect(() => { sessionStorage.setItem('col_element', elementType); }, [elementType]);
  useEffect(() => { sessionStorage.setItem('col_card_type', cardType); }, [cardType]);
  useEffect(() => { sessionStorage.setItem('col_set_id', selectedSetId); }, [selectedSetId]);
  useEffect(() => { sessionStorage.setItem('col_foil_filter', foilFilter); }, [foilFilter]);
  useEffect(() => { localStorage.setItem('col_view_size', viewSize); }, [viewSize]);

  useEffect(() => {
    if (profile) {
      offsetRef.current = 0;
      setOffset(0);
      if (activeTab === 'collection' || activeTab === 'wishlist') {
        fetchCollection(false, 0);
      }
      fetchStats();
      fetchWishlistCardIds();
    }
  }, [profile, activeTab, sortBy, filter, elementType, cardType, selectedSetId, debouncedSearch, foilFilter]);

  const fetchWishlistCardIds = async () => {
    try {
      const { data, error } = await supabase.rpc('get_wishlist_card_ids');
      if (error) throw error;
      setWishlistCardIds(new Set(data || []));
    } catch (err) {
      console.error('Error fetching wishlist card ids:', err);
    }
  };

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
      const targetOffset = currentOffset !== undefined ? currentOffset : offsetRef.current;
      
      if (!isLoadMore) {
        setLoading(true);
        setHasMore(true);
      } else {
        setLoadingMore(true);
      }

      const rarityForApi = filter === 'all' ? null : 
        filter.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('-');
        
      const capitalizedElement = elementType === 'all' ? null : 
        elementType.charAt(0).toUpperCase() + elementType.slice(1);

      const capitalizedCardType = cardType === 'all' ? null : 
        cardType.charAt(0).toUpperCase() + cardType.slice(1);

      const { data, error } = await supabase.rpc('get_user_collection', {
        p_user_id: profile?.id,
        p_rarity: rarityForApi,
        p_sort_by: sortBy,
        p_element_type: capitalizedElement,
        p_card_type_filter: capitalizedCardType,
        p_set_id: selectedSetId === 'all' ? null : selectedSetId,
        p_is_foil: foilFilter === 'all' ? null : foilFilter === 'foil',
        p_limit: PAGE_SIZE,
        p_offset: targetOffset,
        p_search: debouncedSearch || null,
        p_wishlist_only: activeTab === 'wishlist'
      });
      
      if (error) throw error;
      
      const fetchedCards = data || [];
      if (isLoadMore) {
        setCards(prev => [...prev, ...fetchedCards]);
      } else {
        setCards(fetchedCards);
      }

      const newOffset = targetOffset + fetchedCards.length;
      offsetRef.current = newOffset;
      setHasMore(fetchedCards.length === PAGE_SIZE);
      setOffset(newOffset);

      // Mark unseen cards as seen after 5 seconds
      // NOTE: We use c.id (card definition ID) here because the mark_cards_seen RPC 
      // filters by card_id. This marks all instances of this card type as seen.
      const unseenCardIds = fetchedCards.filter((c: any) => c.is_new === true).map((c: any) => c.id);
      if (unseenCardIds.length > 0) {
        setTimeout(async () => {
          try {
            await supabase.rpc('mark_cards_seen', { p_card_ids: unseenCardIds });
          } catch (err) {
            console.error('Error marking cards as seen:', err);
          }
        }, 5000);
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
  }, [hasMore, loadingMore, activeTab]);

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
      // Optimistic update
      setCards(prev => prev.map(c => 
        c.user_card_id === userCardId ? { ...c, is_locked: !c.is_locked } : c
      ));

      const { data, error } = await supabase.rpc('toggle_card_lock', {
        p_user_card_id: userCardId
      });
      if (error) throw error;
      
      const newLockedState = (data as any)?.is_locked as boolean;
      toast.success(newLockedState ? 'Card locked!' : 'Card unlocked!', { id: `lock-${userCardId}` });
      
      // Sync with actual state from server
      setCards(prev => prev.map(c => 
        c.user_card_id === userCardId ? { ...c, is_locked: newLockedState } : c
      ));
    } catch (err: any) {
      // Revert optimistic update on error
      fetchCollection();
      console.error('Error toggling lock:', err);
      toast.error(err.message || 'Failed to toggle lock');
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
    return (card.is_foil || (card.foil_quantity ?? 0) > 0) ? base * 3 : base;
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
          
          setOffset(0);
          fetchCollection(false, 0); // Refresh from start
          toast.success(`Successfully milled ${data.quantity_milled} cards for ${data.gold_earned} Gold!`);
        } catch (err: any) {
          toast.error(err.message || 'Failed to mill');
        }
      }
    });
  };

  const handleQuicksell = async (card: any) => {
    const baseValue = { Common: 10, Uncommon: 25, Rare: 100, 'Super-Rare': 250, Mythic: 500, Divine: 1000 }[card.rarity] ?? 10;
    const value = (card.is_foil || (card.foil_quantity ?? 0) > 0) ? baseValue * 3 : baseValue;
    
    setConfirmConfig({
      isOpen: true,
      title: 'Quicksell Card',
      message: `Quicksell ${card.name} for ${value} Gold?`,
      variant: 'danger',
      onConfirm: async () => {
        // Optimistic update
        const previousCards = [...cards];
        setCards(prev => prev.map(c => {
          if (c.user_card_id !== card.user_card_id) return c;
          const newQty = (c.quantity || 1) - 1;
          return newQty <= 0 ? null : { ...c, quantity: newQty };
        }).filter(Boolean) as any[]);
        
        if (profile) {
          useProfileStore.getState().setProfile({
            ...profile,
            gold_balance: profile.gold_balance + value
          });
        }

        const { data, error } = await supabase.rpc('quicksell_card', {
          p_card_id: card.id,
          p_is_foil: (card.is_foil || (card.foil_quantity ?? 0) > 0) || false,
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
        setOffset(0);
        fetchCollection(false, 0); // Refresh from start
        fetchStats(); // Update stats in background
      }
    });
  };

  const handleBulkMill = async () => {
    try {
      // Calculate preview locally based on stats if available, or just show a general warning
      // Since we don't have a dedicated preview RPC, we'll use the stats we already have
      const duplicateCount = stats ? stats.total_cards - stats.unique_cards : 0;
      
      if (duplicateCount <= 0) {
        toast.error('No duplicates found to mill!');
        return;
      }

      setConfirmConfig({
        isOpen: true,
        title: 'Bulk Mill Duplicates',
        message: `Are you sure you want to mill ${duplicateCount} duplicate cards? This will earn you a significant amount of Gold. This cannot be undone.`,
        variant: 'danger',
        onConfirm: async () => {
          try {
            const { data, error } = await supabase.rpc('mill_bulk_duplicates', { p_card_ids: null });
            if (error) throw error;
            
            setOffset(0);
            fetchCollection(false, 0); // Refresh from start
            fetchStats();
            useProfileStore.getState().refreshProfile();
            
            toast.success(`Successfully milled ${data.cards_milled} cards for ${data.gold_earned} Gold!`, { icon: '🪙' });
          } catch (err: any) {
            toast.error(err.message || 'Failed to bulk mill');
          }
        }
      });
    } catch (err) {
      console.error('Error in bulk mill preview:', err);
    }
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
                {stats.foil_cards > 0 && (
                  <span className="ml-3 text-xl text-yellow-500">✨ {stats.foil_cards}</span>
                )}
              </h2>
              {sets.filter(s => s.is_complete && !s.is_claimed).length > 0 && (
                <p className="text-xs font-black text-emerald-600 mt-1 uppercase tracking-wider flex items-center gap-1">
                  <Trophy className="w-3 h-3" /> {sets.filter(s => s.is_complete && !s.is_claimed).length} Sets Ready to Claim!
                </p>
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
            <button
              onClick={() => setActiveTab('sets')}
              className={cn(
                "px-6 py-2 rounded-lg font-black text-sm uppercase transition-colors",
                activeTab === 'sets' ? "bg-[var(--text)] text-[var(--surface)]" : "text-slate-600 hover:bg-slate-100"
              )}
            >
              Sets
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

      {activeTab === 'sets' ? (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-black uppercase text-[var(--text)] flex items-center gap-2">
              <Trophy className="w-6 h-6 text-emerald-500" />
              Set Collections
            </h2>
            <p className="text-sm font-bold text-slate-500">Collect all cards in a set to earn unique rewards</p>
          </div>

          {loadingSets ? (
            <div className="grid gap-6">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-40 bg-slate-100 animate-pulse rounded-2xl border-4 border-slate-200" />
              ))}
            </div>
          ) : sets.length === 0 ? (
            <EmptyState 
              icon={Trophy}
              title="No Sets Found" 
              description="Set collection data is currently unavailable." 
              ctaText="Back to Collection"
              ctaAction={() => setActiveTab('collection')}
            />
          ) : (
            <div className="grid gap-6">
              {sets.map(set => (
                <React.Fragment key={set.id}>
                  <SetProgress 
                    set={set} 
                    onClaimed={fetchSets} 
                  />
                </React.Fragment>
              ))}
            </div>
          )}
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-4 mb-4 items-center">
        <div className="flex flex-wrap gap-2">
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

        <div className="relative">
          <select 
            value={elementType} 
            onChange={e => setElementType(e.target.value)} 
            className="appearance-none pl-4 pr-10 py-1.5 rounded-full font-black text-xs uppercase border-2 bg-[var(--surface)] text-slate-500 border-[var(--border)] hover:border-slate-400 focus:outline-none focus:border-[var(--text)] transition-all"
          >
            <option value="all">All Elements</option>
            <option value="fire">Fire</option>
            <option value="neutral">Neutral</option>
            <option value="tech">Tech</option>
            <option value="magical">Magical</option>
            <option value="nature">Nature</option>
            <option value="shadow">Shadow</option>
            <option value="ice">Ice</option>
            <option value="void">Void</option>
          </select>
          <Filter className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
        </div>

        <div className="relative">
          <select 
            value={cardType} 
            onChange={e => setCardType(e.target.value)} 
            className="appearance-none pl-4 pr-10 py-1.5 rounded-full font-black text-xs uppercase border-2 bg-[var(--surface)] text-slate-500 border-[var(--border)] hover:border-slate-400 focus:outline-none focus:border-[var(--text)] transition-all"
          >
            <option value="all">All Types</option>
            <option value="unit">Unit</option>
            <option value="event">Event</option>
            <option value="location">Location</option>
            <option value="artifact">Artifact</option>
            <option value="leader">Leader</option>
            <option value="sacred">Sacred</option>
          </select>
          <Filter className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
        </div>

        <div className="relative">
          <select 
            value={selectedSetId} 
            onChange={e => setSelectedSetId(e.target.value)} 
            className="appearance-none pl-4 pr-10 py-1.5 rounded-full font-black text-xs uppercase border-2 bg-[var(--surface)] text-slate-500 border-[var(--border)] hover:border-slate-400 focus:outline-none focus:border-[var(--text)] transition-all"
          >
            <option value="all">All Sets</option>
            {sets.map(set => (
              <option key={set.id} value={set.id}>{set.name}</option>
            ))}
          </select>
          <Filter className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {[
          { id: 'all', label: 'All Versions' },
          { id: 'foil', label: '✨ Foil Only' },
          { id: 'non-foil', label: 'Standard Only' }
        ].map((f) => (
          <button
            key={f.id}
            onClick={() => setFoilFilter(f.id as any)}
            className={cn(
              "px-4 py-1.5 rounded-full font-black text-xs uppercase border-2 transition-all",
              foilFilter === f.id
                ? "bg-[var(--text)] text-[var(--surface)] border-[var(--text)]" 
                : "bg-[var(--surface)] text-slate-500 border-[var(--border)] hover:border-slate-400"
            )}
          >
            {f.label}
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
            <option value="name">Sort by Name</option>
            <option value="newest">Sort by Newest</option>
            <option value="price">Sort by Value</option>
          </select>
          
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-10 py-2 bg-[var(--surface)] border-4 border-[var(--border)] rounded-xl text-[var(--text)] font-bold placeholder-slate-400 focus:outline-none shadow-[4px_4px_0px_0px_var(--border)]"
            />
            {search !== debouncedSearch && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
              </div>
            )}
          </div>

          <button
            onClick={() => setViewSize(prev => prev === 'normal' ? 'large' : 'normal')}
            className="shrink-0 px-4 py-2 bg-[var(--surface)] border-4 border-[var(--border)] rounded-xl text-[var(--text)] font-bold shadow-[4px_4px_0px_0px_var(--border)] flex items-center gap-2 hover:bg-slate-50 transition-colors"
            title={viewSize === 'normal' ? 'Switch to Large Grid' : 'Switch to Normal Grid'}
          >
            <LayoutGrid className="w-5 h-5" />
            <span className="hidden sm:inline">{viewSize === 'normal' ? 'Large Grid' : 'Normal Grid'}</span>
          </button>
        </div>
      </div>

      <div className={cn("grid gap-8", viewSize === 'normal' ? "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6" : "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4")}>
        {filteredCards.map((card) => {
          const selectionId = card.user_card_id;
          return (
          <CollectionCard 
            key={card.user_card_id || card.id}
            card={card}
            isBatchMode={isBatchMode}
            isSelected={selectedCardIds.includes(selectionId)}
            activeTab={activeTab}
            showQuantity={true}
            onSelect={() => {
              if (isBatchMode) {
                setSelectedCardIds(prev => prev.includes(selectionId) ? prev.filter(id => id !== selectionId) : [...prev, selectionId]);
              } else {
                setSelectedCard(card);
              }
            }}
            onToggleLock={() => handleToggleLock(card.user_card_id || card.id)}
            onQuicksell={() => handleQuicksell(card)}
            onList={() => { 
              setCardToList(card);
              setIsListingModalOpen(true);
            }}
            onToggleWishlist={() => handleToggleWishlist(card.id)}
            isWishlisted={wishlistCardIds.has(card.id)}
          />
        )})}
      </div>
      
      {loadingMore && (
        <div className="flex justify-center py-8">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      )}

      {hasMore && filteredCards.length > 0 && activeTab === 'collection' && (
        <div className="mt-8 flex justify-center">
          <button
            onClick={() => fetchCollection(true)}
            disabled={loadingMore}
            className="px-8 py-3 bg-blue-500 hover:bg-blue-600 text-white font-black rounded-xl border-4 border-[var(--border)] shadow-[4px_4px_0px_0px_var(--border)] disabled:opacity-50 transition-all active:translate-y-1"
          >
            {loadingMore ? (
              <div className="flex items-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                Loading...
              </div>
            ) : (
              'Load More Cards'
            )}
          </button>
        </div>
      )}

      {filteredCards.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 bg-[var(--surface)] border-4 border-[var(--border)] rounded-2xl shadow-[8px_8px_0px_0px_var(--border)]">
          <PackageOpen className="w-16 h-16 text-slate-300 mb-4" />
          <h3 className="text-2xl font-black text-[var(--text)] uppercase mb-2">
            {activeTab === 'collection' ? (filter !== 'all' || foilFilter !== 'all' ? `No ${foilFilter !== 'all' ? foilFilter.replace('-', ' ') : filter} cards found` : 'Collection is empty') : 'Wishlist is empty'}
          </h3>
          <p className="text-slate-500 font-bold mb-6 max-w-md text-center">
            {activeTab === 'collection' ? (filter !== 'all' || foilFilter !== 'all' ? 'Try adjusting your filters to find more cards.' : 'Your collection is looking a little empty! Head to the Store to open some packs.') : 'Add items to your wishlist to track them'}
          </p>
          <div className="flex gap-4">
            {(filter !== 'all' || foilFilter !== 'all') && activeTab === 'collection' && (
              <button
                onClick={() => {
                  setFilter('all');
                  setFoilFilter('all');
                  setElementType('all');
                  setCardType('all');
                  setSearch('');
                }}
                className="px-6 py-2 bg-[var(--text)] text-[var(--surface)] font-black rounded-xl border-4 border-[var(--border)] shadow-[4px_4px_0px_0px_var(--border)] transition-transform active:translate-y-1"
              >
                Clear Filters
              </button>
            )}
            <button
              onClick={() => navigate(activeTab === 'collection' ? '/store' : '/marketplace')}
              className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white font-black rounded-xl border-4 border-[var(--border)] shadow-[4px_4px_0px_0px_var(--border)] transition-transform active:translate-y-1"
            >
              {activeTab === 'collection' ? 'Go to Store' : 'Go to Marketplace'}
            </button>
          </div>
        </div>
      )}

      {selectedCard && (
        <Card3DModal
          card={selectedCard}
          cardBackUrl={profile?.card_back_url || null}
          onClose={() => setSelectedCard(null)}
          onSell={activeTab === 'collection' ? handleQuicksell : undefined}
          onList={activeTab === 'collection' ? (card) => {
            setSelectedCard(null);
            setCardToList(card);
            setIsListingModalOpen(true);
          } : undefined}
          onToggleWishlist={handleToggleWishlist}
          isWishlisted={wishlistCardIds.has(selectedCard.id)}
        />
      )}
      {isBatchMode && selectedCardIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[var(--surface)] border-4 border-[var(--border)] p-4 rounded-2xl shadow-[8px_8px_0px_0px_var(--border)] z-50 flex items-center gap-4">
          <div className="flex flex-col">
            <p className="font-black text-[var(--text)]">Selected {selectedCardIds.length} cards</p>
            <div className="flex flex-col text-[10px] font-bold uppercase">
              <p className="text-slate-500">
                {(() => {
                  const selectedList = selectedCardIds.map(id => cards.find(c => c.user_card_id === id)).filter(Boolean);
                  const foils = selectedList.filter(c => c.is_foil || (c.foil_quantity ?? 0) > 0).length;
                  const normal = selectedList.length - foils;
                  return `${normal} Normal • ${foils} Foil`;
                })()}
              </p>
              <p className="text-yellow-600 flex items-center gap-1">
                <Coins className="w-3 h-3" />
                Est. {(() => {
                  const selectedList = selectedCardIds.map(id => cards.find(c => c.user_card_id === id)).filter(Boolean);
                  const total = selectedList.reduce((acc, card) => {
                    const baseValue = { 
                      'Common': 10, 
                      'Uncommon': 25, 
                      'Rare': 100, 
                      'Super-Rare': 250, 
                      'Mythic': 500, 
                      'Divine': 1000 
                    }[card.rarity] ?? 10;
                    return acc + ((card.is_foil || (card.foil_quantity ?? 0) > 0) ? baseValue * 3 : baseValue);
                  }, 0);
                  return total.toLocaleString();
                })()} Gold
              </p>
            </div>
          </div>
          <button 
            onClick={() => {
              const selectedList = selectedCardIds.map(id => cards.find(c => c.user_card_id === id)).filter(Boolean);
              const totalEst = selectedList.reduce((acc, card) => {
                const baseValue = { 'Common': 10, 'Uncommon': 25, 'Rare': 100, 'Super-Rare': 250, 'Mythic': 500, 'Divine': 1000 }[card.rarity] ?? 10;
                return acc + ((card.is_foil || (card.foil_quantity ?? 0) > 0) ? baseValue * 3 : baseValue);
              }, 0);

              setConfirmConfig({
                isOpen: true,
                title: 'Quicksell Selected',
                message: `Are you sure you want to quicksell ${selectedCardIds.length} cards for approximately ${totalEst.toLocaleString()} Gold?`,
                variant: 'danger',
                onConfirm: async () => {
                  try {
                    const results = await Promise.all(selectedList.map(async (card) => {
                      try {
                        const { data, error } = await supabase.rpc('quicksell_card', {
                          p_card_id: card.id,
                          p_is_foil: (card.is_foil || (card.foil_quantity ?? 0) > 0) || false,
                          p_quantity: 1
                        });
                        if (error) throw error;
                        return { success: true, gold: (data as any).gold_earned || 0 };
                      } catch (err) {
                        console.error('Failed to sell card:', card.id, err);
                        return { success: false, gold: 0 };
                      }
                    }));

                    const successCount = results.filter(r => r.success).length;
                    const totalGold = results.reduce((acc, r) => acc + r.gold, 0);

                    if (successCount > 0) {
                      toast.success(`Sold ${successCount} cards for ${totalGold} gold!`, { 
                        id: 'batch-sell-success',
                        icon: '🪙' 
                      });
                      setSelectedCardIds([]);
                      setIsBatchMode(false);
                      fetchCollection();
                      fetchStats();
                      useProfileStore.getState().refreshProfile();
                    } else {
                      throw new Error('Failed to sell any cards');
                    }
                  } catch (err: any) {
                    toast.error(err.message || 'Failed to sell cards', { id: 'batch-sell-error' });
                  }
                }
              });
            }}
            className="px-6 py-3 bg-red-500 hover:bg-red-600 text-white font-black rounded-xl border-4 border-[var(--border)] shadow-[4px_4px_0px_0px_var(--border)] transition-transform active:translate-y-1"
          >
            Quick Sell Selected
          </button>
        </div>
      )}
        </>
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
