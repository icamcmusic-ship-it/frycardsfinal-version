import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useProfileStore } from '../stores/profileStore';
import { Loader2, Search, Filter, LayoutGrid, Coins, Star, PackageOpen, Check, Trophy, Trash2, Sparkles, Award } from 'lucide-react';
import toast from 'react-hot-toast';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { EmptyState } from '../components/EmptyState';
import { Card3DModal } from '../components/Card3DModal';
import { CollectionCard } from '../components/CollectionCard';
import { ConfirmModal } from '../components/ConfirmModal';
import { SetProgress } from '../components/SetProgress';
import { CreateListingModal } from '../components/CreateListingModal';
import { useCollection } from '../hooks/useCollection';

export function Collection() {
  const { profile } = useProfileStore();
  const navigate = useNavigate();

  // Filters State
  const [activeTab, setActiveTab] = useState<'collection' | 'wishlist' | 'sets'>(() => 
    (sessionStorage.getItem('col_active_tab') as any) || 'collection'
  );
  const [filter, setFilter] = useState(() => sessionStorage.getItem('col_filter') || 'all');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sortBy, setSortBy] = useState<'rarity' | 'newest' | 'price' | 'name' | 'serial'>(() =>
    (sessionStorage.getItem('col_sort') as any) || 'rarity'
  );
  const [cardType, setCardType] = useState<string>(() => sessionStorage.getItem('col_card_type') || 'all');
  const [foilFilter, setFoilFilter] = useState<'all' | 'foil' | 'non-foil'>(() => 
    (sessionStorage.getItem('col_foil_filter') as any) || 'all'
  );
  const [lowSerialOnly, setLowSerialOnly] = useState(false);
  const [viewSize, setViewSize] = useState<'normal' | 'large'>(() => 
    (localStorage.getItem('col_view_size') as any) || 'normal'
  );

  // UI State
  const [selectedCard, setSelectedCard] = useState<any>(null);
  const [isListingModalOpen, setIsListingModalOpen] = useState(false);
  const [cardToList, setCardToList] = useState<any>(null);
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [selectedCardIds, setSelectedCardIds] = useState<string[]>([]);
  const loadingMoreRef = useRef(false);
  const [sets, setSets] = useState<any[]>([]);
  const [loadingSets, setLoadingSets] = useState(false);
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

  // Custom Hook for Data
  const { 
    cards, 
    loading, 
    loadingMore, 
    hasMore, 
    stats, 
    wishlistCardIds, 
    fetchCollection, 
    fetchStats,
    setCards 
  } = useCollection(activeTab, {
    rarity: filter,
    sortBy,
    cardType,
    setId: 'all',
    search: debouncedSearch,
    foilFilter,
    lowSerialOnly
  });

  // Effects
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    fetchSets();
  }, []);

  useEffect(() => {
    sessionStorage.setItem('col_active_tab', activeTab);
    sessionStorage.setItem('col_filter', filter);
    sessionStorage.setItem('col_sort', sortBy);
    sessionStorage.setItem('col_card_type', cardType);
    sessionStorage.setItem('col_foil_filter', foilFilter);
    localStorage.setItem('col_view_size', viewSize);
  }, [activeTab, filter, sortBy, cardType, foilFilter, viewSize]);

  useEffect(() => {
    if (profile) {
      fetchSets();
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

  // Actions
  const handleToggleLock = async (userCardId: string) => {
    try {
      setCards(prev => prev.map(c => 
        c.user_card_id === userCardId ? { ...c, is_locked: !c.is_locked } : c
      ));

      const { data, error } = await supabase.rpc('toggle_card_lock', {
        p_user_card_id: userCardId
      });
      if (error) throw error;
      
      const newLockedState = (data as any)?.is_locked as boolean;
      toast.success(newLockedState ? 'Card locked!' : 'Card unlocked!', { id: `lock-${userCardId}` });
      
      setCards(prev => prev.map(c => 
        c.user_card_id === userCardId ? { ...c, is_locked: newLockedState } : c
      ));
    } catch (err: any) {
      fetchCollection();
      toast.error(err.message || 'Failed to toggle lock');
    }
  };

  const handleToggleWishlist = async (cardId: string) => {
    try {
      const { error } = await supabase.rpc('toggle_wishlist', { p_card_id: cardId });
      if (error) throw error;
      fetchCollection();
      toast.success('Wishlist updated!', { icon: '✨' });
    } catch (err) {
      console.error('Error toggling wishlist:', err);
      toast.error('Failed to update wishlist');
    }
  };

  const handleQuicksell = async (card: any) => {
    const foilPrice = ({ Common: 10, Uncommon: 25, Rare: 100, 'Super-Rare': 250, Mythic: 500, Divine: 1000 }[card.rarity] ?? 10) * 3;
    const normalPrice = { Common: 10, Uncommon: 25, Rare: 100, 'Super-Rare': 250, Mythic: 500, Divine: 1000 }[card.rarity] ?? 10;
    
    // Check if we have specific copy or aggregated quantities
    const hasNormal = (card.quantity ?? 0) > 0 || !card.is_foil;
    const hasFoil = (card.foil_quantity ?? 0) > 0 || card.is_foil;

    const performQuicksell = async (sellFoil: boolean) => {
      try {
        const { data, error } = await supabase.rpc('quicksell_card', {
          p_card_id: card.id,
          p_is_foil: sellFoil,
          p_quantity: 1,
        });
        if (error) throw error;
        
        toast.success(`Sold ${card.name} for ${(data as any).gold_earned} Gold!`, { icon: '🪙' });
        supabase.rpc('increment_mission_progress', { p_mission_type: 'quicksell_cards', p_amount: 1 });
        fetchCollection();
        fetchStats();
        useProfileStore.getState().refreshProfile();
      } catch (err: any) {
        toast.error(err.message || 'Failed to sell');
      }
    };

    if (hasFoil && hasNormal && (card.quantity ?? 0) > 0 && (card.foil_quantity ?? 0) > 0) {
      toast((t) => (
        <div className="flex flex-col gap-3">
          <p className="font-bold text-sm">Quicksell {card.name}: Choose Version</p>
          <div className="flex gap-2">
            <button
              onClick={() => { performQuicksell(false); toast.dismiss(t.id); }}
              className="px-3 py-2 bg-slate-200 border-2 border-black rounded-lg text-[10px] font-black uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5 active:shadow-none"
            >
              Normal (+{normalPrice} G)
            </button>
            <button
              onClick={() => { performQuicksell(true); toast.dismiss(t.id); }}
              className="px-3 py-2 bg-yellow-400 border-2 border-black rounded-lg text-[10px] font-black uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5 active:shadow-none"
            >
              Foil (+{foilPrice} G)
            </button>
          </div>
        </div>
      ), { duration: 5000, position: 'bottom-center' });
      return;
    }

    const sellFoil = hasFoil && (card.foil_quantity > 0 || card.is_foil);
    const value = sellFoil ? foilPrice : normalPrice;

    setConfirmConfig({
      isOpen: true,
      title: 'Quicksell Card',
      message: `Quicksell ${sellFoil ? 'Foil ' : ''}${card.name} for ${value} Gold?`,
      variant: 'danger',
      onConfirm: () => performQuicksell(sellFoil)
    });
  };

  const handleBulkMill = async () => {
    // Re-fetch stats first to ensure accurate count
    const freshStats = await fetchStats();
    
    if (!freshStats && !stats) {
      toast.error('Failed to load collection stats');
      return;
    }
    
    // Calculate duplicates after refresh
    const duplicateCount = freshStats ? freshStats.total_cards - freshStats.unique_cards : 
                         stats ? stats.total_cards - stats.unique_cards : 0;
    
    if (duplicateCount <= 0) {
      toast.error('No duplicates found to mill!');
      return;
    }

    setConfirmConfig({
      isOpen: true,
      title: 'Bulk Mill Duplicates',
      message: `Are you sure you want to mill ${duplicateCount} duplicate cards? This cannot be undone.`,
      variant: 'danger',
      onConfirm: async () => {
        try {
          const { data, error } = await supabase.rpc('mill_bulk_duplicates', { p_card_ids: null });
          if (error) throw error;
          
          fetchCollection();
          fetchStats();
          useProfileStore.getState().refreshProfile();
          toast.success(`Successfully milled ${data.cards_milled} cards for ${data.gold_earned} Gold!`, { icon: '🪙' });
          supabase.rpc('increment_mission_progress', { p_mission_type: 'mill_duplicates', p_amount: data.cards_milled });
        } catch (err: any) {
          toast.error(err.message || 'Failed to bulk mill');
        }
      }
    });
  };

  const observerRef = useRef<HTMLDivElement>(null);

  // Infinite scroll listener
  useEffect(() => {
    loadingMoreRef.current = loadingMore;
  }, [loadingMore]);

  useEffect(() => {
    if (activeTab !== 'collection') return;
    
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMoreRef.current) {
          loadingMoreRef.current = true;
          fetchCollection(true);
        }
      },
      { threshold: 0.1, rootMargin: '100px' }
    );

    if (observerRef.current) {
      observer.observe(observerRef.current);
    }

    return () => observer.disconnect();
  }, [hasMore, activeTab, fetchCollection]);

  const isProfileLoading = !profile;
  const isInitialLoad = (loading || isProfileLoading) && cards.length === 0;

  if (isInitialLoad && activeTab !== 'sets') {
    return (
      <div className="space-y-8">
        <div className="h-40 bg-[var(--surface)] border-4 border-[var(--border)] rounded-2xl p-6 shadow-[8px_8px_0px_0px_var(--border)] flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="skeleton-card h-64 bg-[var(--surface)] rounded-2xl border-4 border-[var(--border)] animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  // Handle sets tab while profile is missing
  if (!profile) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Stats Section */}
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
            </div>
            <div className="text-right">
              <p className="text-3xl font-black text-blue-500">{Math.round(stats.completion_pct ?? 0)}%</p>
            </div>
          </div>
          <div className="h-4 bg-[var(--bg)] rounded-full border-4 border-[var(--border)] overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${stats.completion_pct ?? 0}%` }}
              transition={{ duration: 1 }}
              className="h-full bg-gradient-to-r from-blue-500 to-cyan-400"
            />
          </div>
        </div>
      )}

      {/* Header & Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-[var(--text)] tracking-tight uppercase">Collection</h1>
          <p className="text-slate-600 font-bold mt-1">{stats?.total_cards || 0} cards total</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex bg-[var(--surface)] border-4 border-[var(--border)] rounded-xl p-1 shadow-[4px_4px_0px_0px_var(--border)]">
            {(sets.length > 1 ? ['collection', 'wishlist', 'sets'] : ['collection', 'wishlist'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "px-6 py-2 rounded-lg font-black text-sm uppercase transition-colors",
                  activeTab === tab ? "bg-[var(--text)] text-[var(--surface)]" : "text-slate-600 hover:bg-slate-100"
                )}
              >
                {tab}
              </button>
            ))}
          </div>

          {activeTab === 'collection' && !isBatchMode && (
            <div className="flex gap-2">
              <button
                onClick={handleBulkMill}
                className="px-4 py-2 bg-yellow-400 hover:bg-yellow-500 text-black font-black rounded-xl border-4 border-[var(--border)] transition-transform active:translate-y-1 shadow-[4px_4px_0px_0px_var(--border)] flex items-center gap-2"
              >
                <Coins className="w-5 h-5" />
                Mill All Duplicates
              </button>
            </div>
          )}

          {activeTab === 'collection' && isBatchMode && (
            <div className="flex flex-wrap items-center gap-4 bg-blue-50 border-4 border-blue-200 p-4 rounded-2xl shadow-[4px_4px_0px_0px_rgba(59,130,246,0.2)]">
              <div className="flex flex-col">
                <p className="text-xs font-black uppercase text-blue-600">Batch Selection</p>
                <p className="text-sm font-black text-blue-900">{selectedCardIds.length} cards selected</p>
              </div>
              
              <div className="flex flex-wrap gap-2">
                <button
                  disabled={selectedCardIds.length === 0}
                  onClick={() => {
                    setConfirmConfig({
                      isOpen: true,
                      title: 'Mill Selected Cards',
                      message: `Are you sure you want to mill ${selectedCardIds.length} selected cards? This cannot be undone. You will receive Gold based on the card rarities.`,
                      variant: 'danger',
                      onConfirm: async () => {
                        try {
                          const { data, error } = await supabase.rpc('mill_selected_cards', {
                            p_card_ids: selectedCardIds
                          });
                          if (error) throw error;
                          
                          toast.success(`Milled ${selectedCardIds.length} cards for ${data.gold_earned} Gold!`, { icon: '🪙' });
                          setSelectedCardIds([]);
                          setIsBatchMode(false);
                          fetchCollection();
                          fetchStats();
                          useProfileStore.getState().refreshProfile();
                        } catch (err: any) {
                          toast.error(err.message || 'Failed to mill selected cards');
                        }
                      }
                    });
                  }}
                  className="px-4 py-2 bg-red-400 hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed text-black font-black rounded-xl border-4 border-[var(--border)] transition-transform active:translate-y-1 shadow-[4px_4px_0px_0px_var(--border)] flex items-center gap-2"
                >
                  <Trash2 className="w-5 h-5" />
                  Mill {selectedCardIds.length > 0 && `(${selectedCardIds.length})`}
                </button>

                <button
                  disabled={selectedCardIds.length === 0}
                  onClick={() => {
                    setConfirmConfig({
                      isOpen: true,
                      title: 'Quicksell Selected Cards',
                      message: `Are you sure you want to quicksell ${selectedCardIds.length} selected cards? This cannot be undone. You will receive immediate Gold.`,
                      variant: 'warning',
                      onConfirm: async () => {
                        try {
                          const { data, error } = await supabase.rpc('bulk_quicksell_user_cards', {
                            p_user_card_ids: selectedCardIds
                          });
                          if (error) throw error;
                          const totalGold = data?.gold_earned ?? 0;
                          
                          toast.success(`Quicksold ${selectedCardIds.length} cards for ${totalGold} Gold!`, { icon: '💰' });
                          setSelectedCardIds([]);
                          setIsBatchMode(false);
                          fetchCollection();
                          fetchStats();
                          useProfileStore.getState().refreshProfile();
                        } catch (err: any) {
                          toast.error(err.message || 'Failed to quicksell selected cards');
                        }
                      }
                    });
                  }}
                  className="px-4 py-2 bg-yellow-400 hover:bg-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed text-black font-black rounded-xl border-4 border-[var(--border)] transition-transform active:translate-y-1 shadow-[4px_4px_0px_0px_var(--border)] flex items-center gap-2"
                >
                  <Coins className="w-5 h-5" />
                  Quicksell {selectedCardIds.length > 0 && `(${selectedCardIds.length})`}
                </button>
                
                <button
                  onClick={() => {
                    setSelectedCardIds([]);
                    setIsBatchMode(false);
                  }}
                  className="px-4 py-2 bg-white text-slate-500 font-bold rounded-xl border-4 border-slate-200"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {activeTab === 'collection' && sets.length === 1 && (
        <div className="mb-8">
          <SetProgress set={sets[0]} onClaimed={() => { fetchSets(); }} />
        </div>
      )}

      {activeTab === 'sets' && sets.length > 1 ? (
        <div className="grid gap-6">
          {loadingSets ? (
            <div className="flex justify-center py-12"><Loader2 className="w-10 h-10 animate-spin text-blue-500" /></div>
          ) : sets.length === 0 ? (
            <EmptyState icon={Trophy} title="No Sets" description="No sets available." ctaText="Back" ctaAction={() => setActiveTab('collection')} />
          ) : (
            sets.map(set => (
              <div key={set.id}>
                <SetProgress set={set} onClaimed={() => { fetchSets(); }} />
              </div>
            ))
          )}
        </div>
      ) : activeTab === 'sets' ? null : (
        <>
          {/* Filters Bar */}
          <div className="sticky top-16 z-30 bg-[var(--bg)]/90 backdrop-blur-sm py-4 border-b-2 border-[var(--border)] -mx-4 px-4 md:-mx-8 md:px-8">
            <div className="max-w-7xl mx-auto flex flex-wrap gap-3 items-center">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search cards..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-[var(--surface)] border-4 border-[var(--border)] rounded-xl text-[var(--text)] font-bold shadow-[4px_4px_0px_0px_var(--border)]"
                />
              </div>

              {sets.length > 1 && (
                <select
                  value="all"
                  onChange={() => {}}
                  className="px-4 py-2 bg-[var(--surface)] border-4 border-[var(--border)] rounded-xl text-[var(--text)] font-bold shadow-[4px_4px_0px_0px_var(--border)] hidden"
                >
                  <option value="all">All Sets</option>
                  {sets.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              )}

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-4 py-2 bg-[var(--surface)] border-4 border-[var(--border)] rounded-xl text-[var(--text)] font-bold shadow-[4px_4px_0px_0px_var(--border)]"
              >
                <option value="rarity">By Rarity</option>
                <option value="name">By Name</option>
                <option value="newest">By Newest</option>
                <option value="serial">By Serial #</option>
                <option value="price">By Value</option>
              </select>

              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="px-4 py-2 bg-[var(--surface)] border-4 border-[var(--border)] rounded-xl text-[var(--text)] font-bold shadow-[4px_4px_0px_0px_var(--border)]"
              >
                <option value="all">All Rarities</option>
                {['Common', 'Uncommon', 'Rare', 'Super-Rare', 'Mythic', 'Divine'].map(r => (
                  <option key={r} value={r.toLowerCase()}>{r}</option>
                ))}
              </select>

              <select
                value={cardType}
                onChange={(e) => setCardType(e.target.value)}
                className="px-4 py-2 bg-[var(--surface)] border-4 border-[var(--border)] rounded-xl text-[var(--text)] font-bold shadow-[4px_4px_0px_0px_var(--border)]"
              >
                <option value="all">All Types</option>
                {['Unit','Event','Location','Artifact','Leader','Sacred'].map(t => (
                  <option key={t} value={t.toLowerCase()}>{t}</option>
                ))}
              </select>

              <button
                onClick={() => setFoilFilter(prev => prev === 'all' ? 'foil' : prev === 'foil' ? 'non-foil' : 'all')}
                className={cn(
                  "px-4 py-2 font-black rounded-xl border-4 border-[var(--border)] shadow-[4px_4px_0px_0px_var(--border)] transition-all flex items-center gap-2",
                  foilFilter === 'foil' ? "bg-yellow-400 text-black border-yellow-500" : 
                  foilFilter === 'non-foil' ? "bg-slate-200 text-black border-slate-300" : "bg-[var(--surface)]"
                )}
              >
                <Sparkles className={cn("w-4 h-4", foilFilter === 'foil' && "fill-current")} />
                {foilFilter === 'foil' ? 'Foils Only' : foilFilter === 'non-foil' ? 'Non-Foils' : 'All Cards'}
              </button>

              <button
                onClick={() => setLowSerialOnly(!lowSerialOnly)}
                className={cn(
                  "px-4 py-2 font-black rounded-xl border-4 border-[var(--border)] shadow-[4px_4px_0px_0px_var(--border)] transition-all flex items-center gap-2",
                  lowSerialOnly ? "bg-black text-yellow-300 border-black" : "bg-[var(--surface)] text-slate-600"
                )}
              >
                <Award className={cn("w-4 h-4", lowSerialOnly && "text-yellow-300")} />
                Low Serials (#1-10)
              </button>

              <button
                onClick={() => {
                  setSearch('');
                  setSortBy('rarity');
                  setFilter('all');
                  setCardType('all');
                  setFoilFilter('all');
                  setLowSerialOnly(false);
                }}
                className="px-4 py-2 bg-white text-slate-500 font-bold rounded-xl border-4 border-slate-200 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] hover:bg-slate-50 transition-colors"
                title="Clear all filters"
              >
                Clear Filters
              </button>

              <button
                onClick={() => setIsBatchMode(!isBatchMode)}
                className={cn(
                  "px-4 py-2 font-black rounded-xl border-4 border-[var(--border)] shadow-[4px_4px_0px_0px_var(--border)] transition-all",
                  isBatchMode ? "bg-red-500 text-white" : "bg-[var(--surface)]"
                )}
              >
                {isBatchMode ? 'Cancel Selection' : 'Select Multiple'}
              </button>

              <button
                onClick={() => setViewSize(prev => prev === 'normal' ? 'large' : 'normal')}
                className="p-2 bg-[var(--surface)] border-4 border-[var(--border)] rounded-xl shadow-[4px_4px_0px_0px_var(--border)]"
              >
                <LayoutGrid className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Cards Grid */}
          <div className={cn(
            "grid gap-6",
            viewSize === 'normal' ? "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6" : "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
          )}>
            {cards.length === 0 && !loading ? (
              <div className="col-span-full">
                <EmptyState 
                  icon={PackageOpen} 
                  title={(!stats || stats.total_cards === 0) ? "No Cards Owned" : "No Cards Found"} 
                  description={(!stats || stats.total_cards === 0) ? "Open some packs to start your collection!" : "No cards match these filters. Try clearing them."} 
                  ctaText={(!stats || stats.total_cards === 0) ? "Go to Store" : "Clear Filters"} 
                  ctaAction={(!stats || stats.total_cards === 0) ? undefined : () => {
                    setSearch('');
                    setSortBy('rarity');
                    setFilter('all');
                    setCardType('all');
                    setFoilFilter('all');
                    setLowSerialOnly(false);
                  }}
                  ctaPath={(!stats || stats.total_cards === 0) ? "/store" : undefined} 
                />
              </div>
            ) : (
              cards.map(card => (
                <CollectionCard 
                  key={card.user_card_id || card.id}
                  card={card}
                  isBatchMode={isBatchMode}
                  isSelected={selectedCardIds.includes(card.user_card_id)}
                  onSelect={() => {
                    if (isBatchMode) {
                      setSelectedCardIds(prev => prev.includes(card.user_card_id) ? prev.filter(id => id !== card.user_card_id) : [...prev, card.user_card_id]);
                    } else {
                      setSelectedCard(card);
                    }
                  }}
                  onToggleLock={() => handleToggleLock(card.user_card_id)}
                  onToggleWishlist={() => handleToggleWishlist(card.id)}
                  isWishlisted={wishlistCardIds.has(card.id)}
                  showQuantity={true}
                />
              ))
            )}
          </div>

          <div ref={observerRef} className="h-10 w-full" />
          {loadingMore && <div className="flex justify-center py-8"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>}
        </>
      )}

      {/* Modals */}
      {selectedCard && (
        <Card3DModal
          card={selectedCard}
          cardBackUrl={profile?.card_back_url || null}
          onClose={() => setSelectedCard(null)}
          onSell={(activeTab === 'collection' && selectedCard.user_card_id) ? handleQuicksell : undefined}
          onList={(activeTab === 'collection' && selectedCard.user_card_id) ? (card) => {
            setSelectedCard(null);
            setCardToList(card);
            setIsListingModalOpen(true);
          } : undefined}
          onToggleWishlist={handleToggleWishlist}
          isWishlisted={wishlistCardIds.has(selectedCard.id)}
        />
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

