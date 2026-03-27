import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useProfileStore } from '../stores/profileStore';
import { PackageOpen, Sparkles, Loader2, Coins, Gem, Shirt, Store as StoreIcon, LayoutGrid } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn, getRarityStyles } from '../lib/utils';
import toast from 'react-hot-toast';
import { CardDisplay } from '../components/CardDisplay';
import { CollectionCard } from '../components/CollectionCard';
import { Card3DModal } from '../components/Card3DModal';
import { FlipCard } from '../components/FlipCard';
import { EmptyState } from '../components/EmptyState';

import { useLocation, useNavigate } from 'react-router-dom';
import { audioService } from '../services/AudioService';

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
  const navigate = useNavigate();
  const { profile } = useProfileStore();
  const [activeTab, setActiveTab] = useState<'packs' | 'banners' | 'card_backs' | 'inventory'>(
    location.pathname === '/inventory' ? 'inventory' : 'packs'
  );
  const [packs, setPacks] = useState<any[]>([]);
  const [shopItems, setShopItems] = useState<any[]>([]);
  const [userCosmetics, setUserCosmetics] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [opening, setOpening] = useState(false);
  const [openingPackImageUrl, setOpeningPackImageUrl] = useState<string>('');
  const [selectedCard, setSelectedCard] = useState<any>(null);
  const [packOpeningStep, setPackOpeningStep] = useState<'idle' | 'shaking' | 'revealing'>('idle');
  const [openedCards, setOpenedCards] = useState<any[] | null>(null);
  const [openingSummary, setOpeningSummary] = useState<{ xp_gained: number, new_card_count: number } | null>(null);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [revealedCards, setRevealedCards] = useState<any[]>([]);
  const [showFoilSplash, setShowFoilSplash] = useState(false);
  const [flippedIndexes, setFlippedIndexes] = useState<Set<number>>(new Set());
  const [showOdds, setShowOdds] = useState<Record<string, boolean>>({});
  const [inventory, setInventory] = useState<any[]>([]);
  const [useGems, setUseGems] = useState(false);
  const [wishlistCardIds, setWishlistCardIds] = useState<Set<string>>(new Set());
  const [lastPackResults, setLastPackResults] = useState<{ cards: any[], summary: any } | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  const tabLabels: Record<string, string> = {
    packs: 'Packs',
    banners: 'Banners',
    card_backs: 'Card Backs',
    inventory: 'Inventory',
  };

  useEffect(() => {
    if (location.pathname === '/inventory') {
      setActiveTab('inventory');
    } else if (location.pathname === '/store') {
      setActiveTab('packs');
    }
  }, [location.pathname]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && packOpeningStep !== 'idle') {
        setPackOpeningStep('idle');
        setOpening(false);
        setOpenedCards(null);
        setOpeningSummary(null);
        setCurrentCardIndex(0);
        setRevealedCards([]);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [packOpeningStep]);

  useEffect(() => {
    fetchData();
  }, [profile]);

  const fetchData = async () => {
    setLoading(true);
    await Promise.all([fetchPacks(), fetchShopItems(), fetchUserCosmetics(), fetchInventory(), fetchWishlistCardIds()]);
    setLoading(false);
  };

  const fetchWishlistCardIds = async () => {
    try {
      const { data, error } = await supabase.rpc('get_wishlist_card_ids');
      if (error) throw error;
      setWishlistCardIds(new Set(data || []));
    } catch (err) {
      console.error('Error fetching wishlist card ids:', err);
    }
  };

  const fetchPacks = async () => {
    try {
      const { data, error } = await supabase.rpc('get_available_packs');
      if (error) throw error;
      setPacks(data || []);
    } catch (err) {
      console.error('Error fetching packs:', err);
      toast.error('Failed to load packs');
    }
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
    const { data } = await supabase.rpc('get_user_pack_inventory');
    setInventory(data || []);
  };

  useEffect(() => {
    if (activeTab === 'inventory') {
      fetchInventory();
    }
  }, [activeTab]);

  const handleBuyItem = async (itemId: string, priceGold: number, priceGems: number, itemName: string) => {
    audioService.play('click');
    setConfirmModal({
      isOpen: true,
      title: 'Confirm Purchase',
      message: `Are you sure you want to buy ${itemName} for ${priceGems > 0 ? `${priceGems} Gems` : `${priceGold} Gold`}?`,
      onConfirm: async () => {
        try {
          const { data, error } = await supabase.rpc('buy_shop_item', { p_item_id: itemId, p_use_gems: useGems });
          if (error) throw error;
          if (data?.success === false) {
            toast.error(data.error || 'Purchase failed');
            return;
          }
          toast.success(`${data?.item_name || 'Item'} purchased!`, { icon: '✨' });
          fetchUserCosmetics();
          useProfileStore.getState().refreshProfile();
        } catch (err: any) {
          toast.error(err.message || 'Failed to buy item');
        }
      }
    });
  };

  const handleEquip = async (userItemId: string) => {
    try {
      const { data, error } = await supabase.rpc('equip_item', { p_user_item_id: userItemId });
      if (error || data?.success === false) {
        toast.error(error?.message || data?.error || 'Failed to equip');
        return;
      }
      toast.success('Equipped!', { icon: '✨' });
      fetchUserCosmetics();
      useProfileStore.getState().refreshProfile();
    } catch (err: any) {
      toast.error(err.message || 'Failed to equip item');
    }
  };

  const handleUnequip = async (itemType: string) => {
    try {
      const { error } = await supabase.rpc('unequip_cosmetic_type', { p_item_type: itemType });
      if (error) throw error;
      fetchUserCosmetics();
      useProfileStore.getState().refreshProfile();
    } catch (err: any) {
      toast.error(err.message || 'Failed to unequip item');
    }
  };

  const handleOpenPack = async (packId: string, useGems: boolean, packImageUrl: string, packName: string, cost: number, count: number = 1) => {
    if (opening || !profile) return;
    audioService.play('click');
    
    setConfirmModal({
      isOpen: true,
      title: count > 1 ? `Open ${count} Packs` : 'Open Pack',
      message: `Are you sure you want to open ${count > 1 ? `${count}x ` : ''}${packName} for ${cost * count} ${useGems ? 'Gems' : 'Gold'}?`,
      onConfirm: async () => {
        setOpening(true);
        setOpeningPackImageUrl(packImageUrl);
        setPackOpeningStep('shaking');
        audioService.play('pack_shake');

        try {
          let allCards: any[] = [];
          let totalXp = 0;
          let totalNew = 0;

          for (let i = 0; i < count; i++) {
            const { data, error } = await supabase.rpc('open_pack', {
              p_pack_type_id: packId,
              p_use_gems: useGems
            });
            if (error) throw error;
            allCards = [...allCards, ...data.cards];
            totalXp += data.xp_gained;
            totalNew += data.new_card_count;
          }
          
          useProfileStore.getState().refreshProfile();
          
          setOpenedCards(allCards);
          setOpeningSummary({ xp_gained: totalXp, new_card_count: totalNew });
          setCurrentCardIndex(0);
          setRevealedCards([]);
          setFlippedIndexes(new Set());
          
          // Auto-transition after 1.5s if user hasn't clicked
          setTimeout(() => {
            setPackOpeningStep(current => current === 'shaking' ? 'revealing' : current);
            audioService.play('pack_open');
          }, 1500);

          fetchPacks(); // Refresh pity counter
          setLastPackResults({ cards: allCards, summary: { xp_gained: totalXp, new_card_count: totalNew } });

        } catch (err: any) {
          toast.error(err.message || 'Failed to open pack');
          setPackOpeningStep('idle');
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
          audioService.play('error');
        } finally {
          setOpening(false);
        }
      }
    });
  };

  const handleBuyToInventory = async (packId: string, useGems: boolean, packName: string, cost: number) => {
    if (!profile) return;
    
    setConfirmModal({
      isOpen: true,
      title: 'Stash Pack',
      message: `Are you sure you want to stash ${packName} for ${cost} ${useGems ? 'Gems' : 'Gold'}?`,
      onConfirm: async () => {
        try {
          const { error } = await supabase.rpc('buy_pack_to_inventory', {
            p_pack_type_id: packId,
            p_use_gems: useGems
          });

          if (error) throw error;
          
          toast.success('Pack added to inventory!', { icon: '📦' });
          fetchInventory();
          useProfileStore.getState().refreshProfile();
        } catch (err: any) {
          toast.error(err.message || 'Failed to buy pack');
        }
      }
    });
  };

  const handleOpenFromInventory = async (packTypeId: string, packImageUrl: string) => {
    if (opening || !profile) return;
    setOpening(true);
    setOpeningPackImageUrl(packImageUrl);
    setPackOpeningStep('shaking');

    try {
      const { data, error } = await supabase.rpc('open_pack_from_inventory_by_type', {
        p_pack_type_id: packTypeId
      });

      if (error) throw error;
      
      fetchInventory();
      useProfileStore.getState().refreshProfile();
      
      setOpenedCards(data.cards);
      setOpeningSummary({ xp_gained: data.xp_gained, new_card_count: data.new_card_count });
      setCurrentCardIndex(0);
      setRevealedCards([]);
      setFlippedIndexes(new Set());
      
      // Auto-transition after 1.5s if user hasn't clicked
      setTimeout(() => {
        setPackOpeningStep(current => current === 'shaking' ? 'revealing' : current);
        audioService.play('pack_open');
      }, 1500);

      fetchPacks(); // Refresh pity counter
      setLastPackResults({ cards: data.cards, summary: { xp_gained: data.xp_gained, new_card_count: data.new_card_count } });
    } catch (err: any) {
      toast.error(err.message || 'Failed to open pack');
      setPackOpeningStep('idle');
    } finally {
      setOpening(false);
    }
  };


  const handleOpenAllFromInventory = async () => {
    if (opening || !profile || inventory.length === 0) return;
    setOpening(true);
    setPackOpeningStep('shaking');
    
    try {
      let allCards: any[] = [];
      let totalXp = 0;
      let totalNew = 0;
      
      // Open all packs in inventory
      for (const inv of inventory) {
        for (let i = 0; i < inv.quantity; i++) {
          const { data, error } = await supabase.rpc('open_pack_from_inventory_by_type', {
            p_pack_type_id: inv.pack_type_id
          });
          if (error) throw error;
          allCards = [...allCards, ...data.cards];
          totalXp += data.xp_gained;
          totalNew += data.new_card_count;
        }
      }
      
      fetchInventory();
      useProfileStore.getState().refreshProfile();
      setOpenedCards(allCards);
      setOpeningSummary({ xp_gained: totalXp, new_card_count: totalNew });
      setCurrentCardIndex(0);
      setRevealedCards([]);
      setFlippedIndexes(new Set());
      
      // Auto-transition after 1.5s if user hasn't clicked
      setTimeout(() => {
        setPackOpeningStep(current => current === 'shaking' ? 'revealing' : current);
        audioService.play('pack_open');
      }, 1500);

      fetchPacks();
      setLastPackResults({ cards: allCards, summary: { xp_gained: totalXp, new_card_count: totalNew } });
    } catch (err: any) {
      toast.error(err.message || 'Failed to open all packs');
      setPackOpeningStep('idle');
    } finally {
      setOpening(false);
    }
  };

  const handleToggleWishlist = async (cardId: string) => {
    try {
      const { data, error } = await supabase.rpc('toggle_wishlist', { p_card_id: cardId });
      if (error) throw error;
      
      const isAdded = data.added;
      setWishlistCardIds(prev => {
        const next = new Set(prev);
        if (isAdded) next.add(cardId);
        else next.delete(cardId);
        return next;
      });
      
      toast.success(isAdded ? 'Added to wishlist!' : 'Removed from wishlist', {
        icon: isAdded ? '⭐' : '🗑️'
      });
    } catch (err: any) {
      toast.error(err.message || 'Failed to toggle wishlist');
    }
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="h-10 w-48 bg-slate-200 animate-pulse rounded-lg mb-2"></div>
        <div className="flex gap-4 border-b-4 border-[var(--border)] pb-4">
          <div className="h-10 w-24 bg-slate-200 animate-pulse rounded-t-xl"></div>
          <div className="h-10 w-24 bg-slate-200 animate-pulse rounded-t-xl"></div>
          <div className="h-10 w-24 bg-slate-200 animate-pulse rounded-t-xl"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-[var(--surface)] border-4 border-[var(--border)] rounded-2xl overflow-hidden relative shadow-[8px_8px_0px_0px_var(--border)] flex flex-col h-[400px]">
              <div className="aspect-[4/3] bg-slate-200 animate-pulse border-b-4 border-[var(--border)]"></div>
              <div className="p-6 flex flex-col flex-1 gap-4">
                <div className="h-8 w-3/4 bg-slate-200 animate-pulse rounded"></div>
                <div className="h-4 w-full bg-slate-200 animate-pulse rounded"></div>
                <div className="h-4 w-5/6 bg-slate-200 animate-pulse rounded"></div>
                <div className="mt-auto flex gap-2">
                  <div className="h-12 flex-[2] bg-slate-200 animate-pulse rounded-xl"></div>
                  <div className="h-12 flex-1 bg-slate-200 animate-pulse rounded-xl"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <h1 className="text-4xl font-black text-[var(--text)] tracking-tight uppercase">Store</h1>
      
      <div className="flex gap-4 border-b-4 border-[var(--border)] pb-4 overflow-x-auto scrollbar-hide">
        {Object.entries(tabLabels).map(([key, label]) => (
          <button 
            key={key} 
            onClick={() => setActiveTab(key as any)}
            className={cn("px-6 py-2 font-black uppercase rounded-t-xl border-t-4 border-l-4 border-r-4 border-[var(--border)] whitespace-nowrap", activeTab === key ? "bg-[var(--surface)] text-[var(--text)]" : "bg-[var(--bg)] text-slate-500")}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Content based on activeTab */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--surface)] border-4 border-[var(--border)] rounded-2xl p-6 max-w-sm w-full shadow-[8px_8px_0px_0px_var(--border)]">
            <h3 className="text-2xl font-black uppercase text-[var(--text)] mb-2">{confirmModal.title}</h3>
            <p className="text-slate-600 font-bold mb-6">{confirmModal.message}</p>
            <div className="flex gap-4">
              <button
                onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                className="flex-1 py-3 bg-slate-200 hover:bg-slate-300 text-slate-600 font-black rounded-xl border-4 border-[var(--border)] transition-transform active:translate-y-1"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setConfirmModal(prev => ({ ...prev, isOpen: false }));
                  confirmModal.onConfirm();
                }}
                className="flex-1 py-3 bg-blue-500 hover:bg-blue-600 text-white font-black rounded-xl border-4 border-[var(--border)] transition-transform active:translate-y-1 shadow-[4px_4px_0px_0px_var(--border)]"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'packs' && (
        <div className="space-y-8">
          {lastPackResults && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-[var(--surface)] border-4 border-[var(--border)] rounded-2xl p-6 shadow-[8px_8px_0px_0px_var(--border)]"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-black uppercase text-[var(--text)] flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-yellow-500" />
                  Last Pack Results
                </h2>
                <button 
                  onClick={() => setLastPackResults(null)}
                  className="text-xs font-bold text-slate-400 hover:text-red-500 uppercase"
                >
                  Dismiss
                </button>
              </div>
              <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2 mb-4">
                {lastPackResults.cards.map((card, i) => (
                  <div key={i} className="aspect-[5/7] relative group cursor-pointer" onClick={() => setSelectedCard(card)}>
                    <CardDisplay card={card} showQuantity={false} showNewBadge={false} />
                  </div>
                ))}
              </div>
              <div className="flex gap-4 text-xs font-black uppercase">
                <span className="text-blue-500">+{lastPackResults.summary.xp_gained} XP</span>
                <span className="text-yellow-500">{lastPackResults.summary.new_card_count} New Cards</span>
              </div>
            </motion.div>
          )}

          {packs.length === 0 ? (
          <EmptyState 
            icon={PackageOpen}
            title="No packs available"
            description="Check back later for new pack releases!"
            ctaText="Back to Home"
            ctaPath="/"
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {packs.map((pack) => {
              const canAffordGold = (pack.cost_gold != null && pack.cost_gold > 0)
                ? (profile?.gold_balance ?? 0) >= pack.cost_gold
                : true;
              const canAffordGems = (pack.cost_gems != null && pack.cost_gems > 0)
                ? (profile?.gem_balance ?? 0) >= pack.cost_gems
                : true;
              const canAfford = canAffordGold && canAffordGems;

              return (
                <motion.div 
                  key={pack.id}
                  whileHover={{ y: -4, rotate: -1 }}
                  className={cn("bg-[var(--surface)] border-4 border-[var(--border)] rounded-2xl overflow-hidden relative group shadow-[8px_8px_0px_0px_var(--border)] flex flex-col", !canAfford && "opacity-60")}
                >
                  <div className="aspect-[4/3] bg-blue-100 flex items-center justify-center p-8 relative border-b-4 border-[var(--border)]">
                    <div className="w-32 aspect-[3/4] rounded-xl overflow-hidden border-4 border-[var(--border)] bg-gradient-to-b from-slate-700 to-slate-900 relative transform group-hover:scale-105 group-hover:rotate-3 transition-all duration-300 shadow-[4px_4px_0px_0px_var(--border)]">
                      <img
                        src={pack.image_url}
                        alt={pack.name}
                        className="w-full h-full object-cover relative z-10"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                        referrerPolicy="no-referrer"
                        loading="lazy"
                      />
                      {/* Fallback pack art shown when image fails */}
                      <div className="absolute inset-0 flex items-center justify-center z-0">
                        <PackageOpen className="w-16 h-16 text-white/30" />
                      </div>
                    </div>
                  </div>

                  <div className="p-6 flex flex-col flex-1">
                    <h3 className="text-2xl font-black text-[var(--text)] mb-2 uppercase">{pack.name}</h3>
                    
                    {/* Pity Progress Bar */}
                    {pack.next_pity_in !== undefined && (
                      <div className="mt-1 mb-4">
                        <div className="flex justify-between text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">
                          <span className="flex items-center gap-1">
                            <Sparkles className="w-3 h-3 text-blue-500" />
                            Rare+ Pity
                          </span>
                          <span>{pack.next_pity_in} packs away</span>
                        </div>
                        <div className="h-2.5 bg-[var(--bg)] rounded-full border-2 border-[var(--border)] overflow-hidden shadow-inner">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${((10 - pack.next_pity_in) / 10) * 100}%` }}
                            className={cn(
                              "h-full transition-all duration-500",
                              pack.next_pity_in === 1 ? "bg-yellow-400 animate-pulse" : "bg-blue-500"
                            )}
                          />
                        </div>
                      </div>
                    )}

                    <p className="text-sm text-slate-600 font-bold mb-6 line-clamp-2 flex-1">{pack.description}</p>
                    <p className="text-[10px] text-slate-400 italic mb-2">Pity system: Rare+ guaranteed after 10 pulls without one.</p>
                    
                    <button onClick={() => setShowOdds(prev => ({...prev, [pack.id]: !prev[pack.id]}))}
                      className="text-xs text-slate-500 font-bold underline mt-1 mb-2">
                      {showOdds[pack.id] ? 'Hide Odds' : 'View Odds'}
                    </button>
                    {showOdds[pack.id] && (
                      <div className="mb-4 space-y-1 text-xs font-bold border-t border-[var(--border)] pt-2">
                        {PACK_ODDS.map(o => {
                          let displayPct = o.pct;
                          let isPityBoosted = false;
                          
                          if (pack.next_pity_in === 1) {
                            if (o.rarity === 'Common' || o.rarity === 'Uncommon') {
                              displayPct = '0%';
                            } else if (o.rarity === 'Rare') {
                              // In pity, Rare becomes the baseline (80%+)
                              displayPct = '80%*';
                              isPityBoosted = true;
                            } else {
                              // Higher rarities also get a slight boost or stay same
                              // This is just for display to show pity is active
                              isPityBoosted = true;
                            }
                          }

                          return (
                            <div key={o.rarity} className="flex justify-between items-center">
                              <span className={cn(o.color, isPityBoosted && "font-black underline decoration-2 underline-offset-2")}>
                                {o.rarity}
                                {isPityBoosted && o.rarity === 'Rare' && <span className="ml-1 text-[8px] opacity-70">(Pity)</span>}
                              </span>
                              <span className={cn("text-[var(--text)]", isPityBoosted && "text-blue-600 font-black")}>
                                {displayPct}
                              </span>
                            </div>
                          );
                        })}
                        {pack.next_pity_in === 1 && (
                          <p className="text-[9px] text-blue-500 italic mt-1">* Pity active: Guaranteed Rare or better.</p>
                        )}
                        {pack.foil_chance && (
                          <div className="flex justify-between text-yellow-600">
                            <span>Foil Chance</span>
                            <span>{(Number(pack.foil_chance) * 100).toFixed(2)}%</span>
                          </div>
                        )}
                      </div>
                    )}
                    
                    <div className="flex flex-col gap-3 mt-auto">
                      {pack.cost_gold > 0 && (
                        <div className="flex flex-col gap-2">
                          <div className="flex gap-2">
                            <button 
                              onClick={() => handleOpenPack(pack.id, false, pack.image_url, pack.name, pack.cost_gold)}
                              disabled={opening || (profile?.gold_balance || 0) < pack.cost_gold}
                              className="flex-[2] bg-yellow-400 hover:bg-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed text-black font-black py-3 rounded-xl border-4 border-[var(--border)] transition-transform active:translate-y-1 shadow-[4px_4px_0px_0px_var(--border)] flex items-center justify-center gap-2"
                            >
                              <Coins className="w-5 h-5 text-yellow-700" />
                              Open
                            </button>
                            <button 
                              onClick={() => handleBuyToInventory(pack.id, false, pack.name, pack.cost_gold)}
                              disabled={opening || (profile?.gold_balance || 0) < pack.cost_gold}
                              className="flex-1 bg-[var(--bg)] hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed text-[var(--text)] font-black py-3 rounded-xl border-4 border-[var(--border)] transition-transform active:translate-y-1 shadow-[4px_4px_0px_0px_var(--border)] flex items-center justify-center"
                              title="Buy to Inventory"
                            >
                              Stash
                            </button>
                          </div>
                          <button 
                            onClick={() => handleOpenPack(pack.id, false, pack.image_url, pack.name, pack.cost_gold, 10)}
                            disabled={opening || (profile?.gold_balance || 0) < pack.cost_gold * 10}
                            className="w-full bg-purple-500 hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black py-2 rounded-xl border-4 border-[var(--border)] transition-transform active:translate-y-1 shadow-[4px_4px_0px_0px_var(--border)] flex items-center justify-center gap-2 text-sm"
                          >
                            Open 10x ({(pack.cost_gold * 10).toLocaleString()} Gold)
                          </button>
                        </div>
                      )}
                      {pack.cost_gems > 0 && (
                        <div className="flex flex-col gap-2">
                          <div className="flex gap-2">
                            <button 
                              onClick={() => handleOpenPack(pack.id, true, pack.image_url, pack.name, pack.cost_gems)}
                              disabled={opening || (profile?.gem_balance || 0) < pack.cost_gems}
                              className="flex-[2] bg-emerald-400 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-black font-black py-3 rounded-xl border-4 border-[var(--border)] transition-transform active:translate-y-1 shadow-[4px_4px_0px_0px_var(--border)] flex items-center justify-center gap-2"
                            >
                              <Gem className="w-5 h-5 text-emerald-700" />
                              Open
                            </button>
                            <button 
                              onClick={() => handleBuyToInventory(pack.id, true, pack.name, pack.cost_gems)}
                              disabled={opening || (profile?.gem_balance || 0) < pack.cost_gems}
                              className="flex-1 bg-[var(--bg)] hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed text-[var(--text)] font-black py-3 rounded-xl border-4 border-[var(--border)] transition-transform active:translate-y-1 shadow-[4px_4px_0px_0px_var(--border)] flex items-center justify-center"
                              title="Buy to Inventory"
                            >
                              Stash
                            </button>
                          </div>
                          <button 
                            onClick={() => handleOpenPack(pack.id, true, pack.image_url, pack.name, pack.cost_gems, 5)}
                            disabled={opening || (profile?.gem_balance || 0) < pack.cost_gems * 5}
                            className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-black font-black py-2 rounded-xl border-4 border-[var(--border)] transition-transform active:translate-y-1 shadow-[4px_4px_0px_0px_var(--border)] flex items-center justify-center gap-2 text-sm"
                          >
                            Open 5x
                          </button>
                          <button 
                            onClick={() => handleOpenPack(pack.id, true, pack.image_url, pack.name, pack.cost_gems, 10)}
                            disabled={opening || (profile?.gem_balance || 0) < pack.cost_gems * 10}
                            className="w-full bg-purple-500 hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black py-2 rounded-xl border-4 border-[var(--border)] transition-transform active:translate-y-1 shadow-[4px_4px_0px_0px_var(--border)] flex items-center justify-center gap-2 text-sm"
                          >
                            Open 10x ({(pack.cost_gems * 10).toLocaleString()} Gems)
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )
      }
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
                  {item.cost_gold === 0 && !item.cost_gems
                    ? <span className="text-green-500 font-black text-sm uppercase">🎁 Free</span>
                    : item.cost_gems > 0
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
                    onClick={() => handleBuyItem(item.id, item.cost_gold, item.cost_gems, item.name)}
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
                  {item.cost_gold === 0 && !item.cost_gems
                    ? <span className="text-green-500 font-black text-sm uppercase">🎁 Free</span>
                    : item.cost_gems > 0
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
                    onClick={() => handleBuyItem(item.id, item.cost_gold, item.cost_gems, item.name)}
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
          
          <div className="bg-[var(--surface)] border-4 border-[var(--border)] rounded-2xl p-6 shadow-[8px_8px_0px_0px_var(--border)]">
            {inventory.length > 0 && (
              <button 
                onClick={handleOpenAllFromInventory}
                disabled={opening}
                className="mb-6 w-full py-4 bg-yellow-400 hover:bg-yellow-500 disabled:opacity-50 text-black font-black rounded-xl border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] uppercase tracking-widest transition-all active:translate-y-1 active:shadow-none flex items-center justify-center gap-2"
              >
                <PackageOpen className="w-6 h-6" />
                Open All ({inventory.reduce((acc, inv) => acc + inv.quantity, 0)} Packs)
              </button>
            )}
            <h3 className="font-black uppercase mb-4 text-[var(--text)]">Packs</h3>
            {inventory.length === 0 ? (
              <p className="text-slate-500 font-bold">No packs in inventory.</p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {inventory.map(inv => (
                  <div key={inv.id || inv.pack_type_id} className="border-4 border-[var(--border)] bg-[var(--bg)] rounded-xl p-3 text-center transition-all">
                    <div className="aspect-[3/4] rounded overflow-hidden mb-2 border-2 border-[var(--border)] bg-gray-200">
                      <img src={inv.image_url} alt={inv.name} className="w-full h-full object-cover" />
                    </div>
                    <p className="text-xs font-black uppercase text-[var(--text)]">{inv.name}</p>
                    <p className="text-xs font-bold text-slate-500 mb-2">Quantity: {inv.quantity}</p>
                    <button 
                      onClick={() => handleOpenFromInventory(inv.pack_type_id, inv.image_url)}
                      disabled={opening}
                      className="w-full py-2 bg-red-500 text-white text-xs font-black rounded border-2 border-black hover:bg-red-600 disabled:opacity-50"
                    >
                      Open Pack
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {['profile_banner', 'card_back'].map(slotType => (
            <div key={slotType} className="bg-[var(--surface)] border-4 border-[var(--border)] rounded-2xl p-6 shadow-[8px_8px_0px_0px_var(--border)]">
              <h3 className="font-black uppercase mb-4 text-[var(--text)]">{slotType.replace('_', ' ')}</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {userCosmetics.filter(c => c.item_type === slotType).map(c => (
                  <div key={c.user_item_id} className={cn(
                    "border-4 rounded-xl p-3 text-center transition-all",
                    c.is_equipped ? "border-yellow-500 bg-yellow-50" : "border-[var(--border)] bg-[var(--bg)]"
                  )}>
                    <div className={cn("rounded overflow-hidden mb-2 border-2 border-[var(--border)]", slotType === 'card_back' ? 'aspect-[3/4]' : 'aspect-video')}>
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
        <div className="fixed inset-0 bg-black/95 z-50 flex flex-col items-center justify-center p-4 overflow-hidden">
          <button
            onClick={() => {
              setPackOpeningStep('idle');
              setOpening(false);
              setOpenedCards(null);
              setOpeningSummary(null);
              setCurrentCardIndex(0);
              setRevealedCards([]);
              setFlippedIndexes(new Set());
            }}
            className="absolute top-4 right-4 text-white/60 hover:text-white font-black text-2xl"
          >
            ✕
          </button>
          
          {/* Foil Splash Overlay */}
          <AnimatePresence>
            {showFoilSplash && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[999] pointer-events-none flex items-center justify-center"
                style={{ background: 'radial-gradient(circle, rgba(255,215,0,0.4), transparent 70%)' }}
              >
                <motion.p
                  initial={{ scale: 0.5, rotate: -10 }}
                  animate={{ scale: 1.2, rotate: 3 }}
                  exit={{ scale: 2, opacity: 0 }}
                  className="text-6xl font-black text-yellow-400 uppercase tracking-widest drop-shadow-lg"
                  style={{ textShadow: '0 0 30px gold' }}
                >
                  ✨ FOIL!
                </motion.p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Particle burst — always visible */}
          {packOpeningStep !== 'idle' && (
            <div className="absolute inset-0 pointer-events-none">
              {[...Array(20)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-2 h-2 rounded-full bg-yellow-400"
                  style={{ left: '50%', top: '50%' }}
                  animate={{
                    x: (Math.random() - 0.5) * 600,
                    y: (Math.random() - 0.5) * 600,
                    opacity: [1, 0],
                    scale: [1, 0],
                  }}
                  transition={{ duration: 1.2, delay: Math.random() * 0.5, ease: 'easeOut' }}
                />
              ))}
            </div>
          )}

          {packOpeningStep === 'shaking' && (
            <div 
              className="flex flex-col items-center gap-6 cursor-pointer group"
              onClick={() => {
                if (openedCards && openedCards.length > 0) {
                  setPackOpeningStep('revealing');
                }
              }}
            >
              <motion.div
                animate={{ 
                  rotate: [-3, 3, -3, 3, -3, 3, 0],
                  scale: [1, 1.05, 1, 1.05, 1, 1.05, 1.1],
                  boxShadow: [
                    '0 0 20px rgba(250,204,21,0.4)',
                    '0 0 60px rgba(250,204,21,0.8)',
                    '0 0 20px rgba(250,204,21,0.4)'
                  ]
                }}
                transition={{ 
                  rotate: { duration: 0.2, repeat: Infinity },
                  scale: { duration: 0.6, repeat: Infinity },
                  boxShadow: { duration: 1, repeat: Infinity }
                }}
                className="w-40 h-56 rounded-xl border-4 border-yellow-400 overflow-hidden shadow-[0_0_40px_rgba(250,204,21,0.6)] relative"
              >
                <img src={openingPackImageUrl} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                  <p className="text-white font-black text-xs uppercase opacity-0 group-hover:opacity-100 transition-opacity">Click to Skip</p>
                </div>
              </motion.div>
              <motion.p 
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 0.8, repeat: Infinity }}
                className="text-yellow-400 font-black text-2xl uppercase tracking-widest"
              >
                {openedCards && openedCards.length > 0 ? 'Ready!' : 'Opening...'}
              </motion.p>
              <p className="text-white/40 text-sm font-bold">tap to skip</p>
            </div>
          )}

          {packOpeningStep === 'revealing' && openedCards && (
            <div className="flex flex-col items-center gap-8 w-full max-w-6xl h-full overflow-y-auto py-12 scrollbar-hide">
              
              {revealedCards.length < openedCards.length ? (
                <div className="relative w-full flex flex-col items-center">
                  <button
                    onClick={() => {
                      audioService.play('click');
                      setRevealedCards([...openedCards]);
                      setFlippedIndexes(new Set(openedCards.map((_, i) => i)));
                    }}
                    className="absolute top-0 right-0 px-4 py-2 bg-white/20 hover:bg-white/30 text-white font-black rounded-xl border-2 border-white/40 transition-colors z-50"
                  >
                    Skip All
                  </button>
                  
                  <p className="text-white/60 font-black text-sm uppercase tracking-widest mb-8">
                    Revealed {revealedCards.length} of {openedCards.length}
                  </p>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6 w-full px-4">
                    {openedCards.slice(0, revealedCards.length + 1).map((card, i) => (
                      <div 
                        key={i} 
                        className="aspect-[3/4] w-full max-w-[200px] mx-auto"
                        onClick={() => {
                          if (!flippedIndexes.has(i)) {
                            setFlippedIndexes(prev => new Set([...prev, i]));
                            
                            // Foil splash
                            if (card.is_foil) {
                              setShowFoilSplash(true);
                              setTimeout(() => setShowFoilSplash(false), 1200);
                            }

                            // Delay adding to revealedCards to allow FlipCard animation
                            setTimeout(() => {
                              setRevealedCards(prev => {
                                if (prev.some(c => c === card)) return prev;
                                return [...prev, card];
                              });
                            }, 400);
                          }
                        }}
                      >
                        <FlipCard
                          card={card}
                          isFlipped={flippedIndexes.has(i)}
                          cardBackUrl={profile?.card_back_url || null}
                          onReveal={() => {}} // Handled by onClick above
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                // All revealed — show grid + summary
                <div className="flex flex-col items-center gap-6 w-full">
                  <p className="text-white font-black text-3xl uppercase tracking-widest mb-4">🎉 Pack Complete!</p>
                  
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4 w-full">
                    {revealedCards.map((card, i) => (
                      <CollectionCard
                        key={i}
                        card={card}
                        className="aspect-[5/7]"
                        onSelect={() => setSelectedCard(card)}
                      />
                    ))}
                  </div>

                  {selectedCard && (
                    <Card3DModal
                      card={selectedCard}
                      cardBackUrl={profile?.card_back_url || null}
                      onClose={() => setSelectedCard(null)}
                      isWishlisted={wishlistCardIds.has(selectedCard.id)}
                      onToggleWishlist={() => handleToggleWishlist(selectedCard.id)}
                    />
                  )}

                  {openingSummary && (
                    <div className="flex gap-6 bg-white/10 px-6 py-3 rounded-xl border-2 border-white/20">
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
                  
                  <div className="flex gap-4">
                    <button
                      onClick={() => { setPackOpeningStep('idle'); setOpening(false); setOpenedCards(null); setOpeningSummary(null); setCurrentCardIndex(0); setRevealedCards([]); }}
                      className="px-8 py-4 bg-white text-black font-black rounded-xl border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-transform active:translate-y-1"
                    >
                      Done
                    </button>
                    <button
                      onClick={() => { 
                        navigate('/collection?sort=newest'); 
                        setPackOpeningStep('idle'); 
                        setOpening(false); 
                        setOpenedCards(null); 
                        setOpeningSummary(null); 
                        setCurrentCardIndex(0); 
                        setRevealedCards([]); 
                      }}
                      className="px-8 py-4 bg-blue-500 text-white font-black rounded-xl border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-transform active:translate-y-1 flex items-center gap-2"
                    >
                      <LayoutGrid className="w-5 h-5" />
                      View in Collection
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

