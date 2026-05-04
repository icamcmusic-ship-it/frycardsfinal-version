import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useProfileStore } from '../stores/profileStore';
import { PackageOpen, Sparkles, Loader2, Coins, Gem, Shirt, Store as StoreIcon, LayoutGrid, Star, Zap, Plus, Target, Award, Package } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn, getRarityStyles } from '../lib/utils';
import toast from 'react-hot-toast';
import { CardDisplay } from '../components/CardDisplay';
import { CollectionCard } from '../components/CollectionCard';
import { ConfirmModal } from '../components/ConfirmModal';
import { Card3DModal } from '../components/Card3DModal';
import { FlipCard } from '../components/FlipCard';
import { EmptyState } from '../components/EmptyState';
import { ShopSection } from '../components/ShopSection';
import { PackOpeningFan } from '../components/PackOpeningFan';

import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { audioService } from '../services/AudioService';

const SLOT_LABELS: Record<string, { label: string; color: string }> = {
  foundation:        { label: '✅ Common (100%)',                    color: 'text-slate-500' },
  foil_foundation:   { label: '✨ Foil Common (100%)',               color: 'text-slate-400' },
  synergy:           { label: '🟢 Uncommon (100%)',                  color: 'text-green-600' },
  foil_synergy:      { label: '✨ Foil Uncommon (100%)',             color: 'text-green-500' },
  variance:          { label: '🎲 Common 98.5% / Mythic-Divine 1.5%', color: 'text-orange-500' },
  chase:             { label: '🎯 Rare 87.6% / SR 12.4%',           color: 'text-blue-600' },
  foil_chase:        { label: '✨ Foil Rare 87.6% / SR 12.4%',      color: 'text-blue-400' },
  foil_chase_sr_plus:{ label: '✨ Foil SR+ guaranteed',             color: 'text-purple-500' },
  wildcard:          { label: '🃏 Any rarity (pity-tracked)',        color: 'text-indigo-500' },
  foil_wildcard:     { label: '✨ Foil Any (1% SR+ floor)',          color: 'text-indigo-400' },
  mythic_or_divine:  { label: '🔥 Guaranteed Mythic or Divine',     color: 'text-red-500' },
  sr_or_higher:      { label: '⭐ Guaranteed SR+',                   color: 'text-purple-600' },
};

function SlotBreakdown({ slotConfig }: { slotConfig: any[] }) {
  if (!slotConfig) return null;
  // Count and group slots
  const counts: Record<string, number> = {};
  slotConfig.forEach(s => { counts[s.type] = (counts[s.type] || 0) + 1; });
  return (
    <div className="space-y-1 text-xs mt-2 border-t border-[var(--border)] pt-2">
      <p className="font-black text-[10px] text-slate-400 uppercase mb-1">Pack Slots</p>
      {Object.entries(counts).map(([type, count]) => (
        <div key={type} className={cn("flex justify-between items-center gap-2", SLOT_LABELS[type]?.color || 'text-gray-500')}>
          <span className="font-bold truncate">{SLOT_LABELS[type]?.label || type}</span>
          <span className="font-black">×{count}</span>
        </div>
      ))}
    </div>
  );
}

export function Store() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { profile } = useProfileStore();
  
  const tabFromUrl = searchParams.get('tab') as any;
  const openPackId = searchParams.get('open');
  const initialTab = ['packs', 'inventory', 'shop', 'spark'].includes(tabFromUrl) 
    ? tabFromUrl 
    : 'packs';
  
  const [activeTab, setActiveTab] = useState<'packs' | 'inventory' | 'shop' | 'spark'>(initialTab);
  const [packs, setPacks] = useState<any[]>([]);
  const [shopItems, setShopItems] = useState<any[]>([]);
  const [userCosmetics, setUserCosmetics] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [opening, setOpening] = useState(false);
  const [openingPackImageUrl, setOpeningPackImageUrl] = useState<string>('');
  const [selectedCard, setSelectedCard] = useState<any>(null);
  const [packOpeningStep, setPackOpeningStep] = useState<'idle' | 'shaking' | 'revealing'>('idle');
  const [openedCards, setOpenedCards] = useState<any[] | null>(null);
  const [openingSummary, setOpeningSummary] = useState<{ 
    xp_gained: number, 
    new_card_count: number,
    pack_points_earned?: number 
  } | null>(null);
  const [showGodPackCinematic, setShowGodPackCinematic] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<{ current: number, total: number } | null>(null);
  const [collectionStats, setCollectionStats] = useState<any>(null);
  const [showOdds, setShowOdds] = useState<Record<string, boolean>>({});
  const [cosmicUseGems, setCosmicUseGems] = useState<Record<string, boolean>>({});
  const [inventory, setInventory] = useState<any[]>([]);
  const [wishlistCardIds, setWishlistCardIds] = useState<Set<string>>(new Set());
  const [lastPackResults, setLastPackResults] = useState<{ cards: any[], summary: any } | null>(null);
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    variant?: 'danger' | 'warning' | 'info';
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  useEffect(() => {
    if (profile) {
      // No mission tracking for visit_shop
    }
  }, [profile]);

  useEffect(() => {
    if (openPackId && inventory.length > 0 && !opening) {
      const packToOpen = inventory.find(p => p.pack_type_id === openPackId);
      if (packToOpen) {
        handleOpenFromInventory(packToOpen.id, packToOpen.image_url);
        // Clear the param after opening
        navigate('/store?tab=inventory', { replace: true });
      }
    }
  }, [openPackId, inventory, opening]);

  const tabLabels: Record<string, string> = {
    packs: 'Packs',
    inventory: 'Inventory',
    shop: 'Shop',
    spark: 'Spark',
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
    await Promise.all([fetchPacks(), fetchUserCosmetics(), fetchInventory(), fetchWishlistCardIds(), fetchShopItems(), fetchCollectionStats()]);
    setLoading(false);
  };

  const fetchCollectionStats = async () => {
    try {
      const { data } = await supabase.rpc('get_my_collection_stats');
      if (data) setCollectionStats(data);
    } catch (err) {
      console.error('Error fetching collection stats:', err);
    }
  };

  const fetchShopItems = async () => {
    try {
      const { data, error } = await supabase
        .from('shop_items')
        .select('*')
        .order('item_type', { ascending: true })
        .order('cost_gold', { ascending: true, nullsFirst: false });
      if (error) throw error;
      setShopItems(data || []);
    } catch (err) {
      console.error('Error fetching shop items:', err);
    }
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

  const handleEquip = async (userItemId: string) => {
    try {
      const { data, error } = await supabase.rpc('equip_item', { p_user_item_id: userItemId });
      if (error || data?.success === false) {
        toast.error(error?.message || data?.error || 'Failed to equip');
        return;
      }
      toast.success('Profile updated!', { icon: '✨' });
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
      toast.success('Profile updated!', { icon: '✨' });
      fetchUserCosmetics();
      useProfileStore.getState().refreshProfile();
    } catch (err: any) {
      toast.error(err.message || 'Failed to unequip item');
    }
  };

  const handleOpenPack = async (packId: string, useGems: boolean, packImageUrl: string, packName: string, cost: number, count: number = 1) => {
    if (opening || !profile) return;
    audioService.play('click');
    
    setConfirmConfig({
      isOpen: true,
      title: count > 1 ? `Open ${count} Packs` : 'Open Pack',
      message: `Are you sure you want to open ${count > 1 ? `${count}x ` : ''}${packName} for ${cost * count} ${useGems ? 'Gems' : 'Gold'}?`,
      variant: 'info',
      onConfirm: async () => {
        setOpening(true);
        setOpeningPackImageUrl(packImageUrl);
        setPackOpeningStep('shaking');
        audioService.play('pack_shake');

        try {
          const results = [];
          setBulkProgress({ current: 0, total: count });
          
          let hasGodPack = false;

          for (let i = 0; i < count; i++) {
            const { data, error } = await supabase.rpc('open_pack', {
              p_pack_type_id: packId,
              p_use_gems: useGems
            });
            
            if (error) throw error;
            results.push(data);
            setBulkProgress({ current: i + 1, total: count });
            
            // Update missions & quests
            supabase.rpc('increment_mission_progress', { p_mission_type: 'open_packs', p_amount: 1 });
            
            // ✨ Show god pack immediately on detection
            if (data.is_god_pack && !hasGodPack) {
              hasGodPack = true;
              setShowGodPackCinematic(true);
              audioService.play('god_pack_alarm');
            }
          }

          let allCards: any[] = [];
          let totalXp = 0;
          let totalNew = 0;
          let totalPoints = 0;

          for (const data of results) {
            allCards = [...allCards, ...data.cards];
            totalXp += data.xp_gained;
            totalNew += data.new_card_count;
            totalPoints += data.pack_points_earned || 0;
          }

          if (hasGodPack) {
            setShowGodPackCinematic(true);
            audioService.play('god_pack_alarm');
            toast.success('⚡ GOD PACK! All cards are Super-Rare or better!', {
              duration: 10000,
              icon: '🌟',
              style: { background: '#ffdf6c', fontWeight: 'bold', border: '4px solid black' }
            });
          }
          
          setOpenedCards(allCards);
          setOpeningSummary({ 
            xp_gained: totalXp, 
            new_card_count: totalNew,
            pack_points_earned: totalPoints
          });
          
          // Auto-transition after 1s if cards are ready, enough for some shake
          setTimeout(() => {
            setPackOpeningStep(current => current === 'shaking' ? 'revealing' : current);
            audioService.play('pack_open');
          }, 1000);

          // Notify missions update
          window.dispatchEvent(new CustomEvent('missions_updated'));

          setLastPackResults({ 
            cards: allCards, 
            summary: { 
              xp_gained: totalXp, 
              new_card_count: totalNew,
              pack_points_earned: totalPoints
            } 
          });

        } catch (err: any) {
          toast.error(err.message || 'Failed to open pack');
          setPackOpeningStep('idle');
          setConfirmConfig(prev => ({ ...prev, isOpen: false }));
          audioService.play('error');
        } finally {
          setOpening(false);
          useProfileStore.getState().refreshProfile();
          fetchPacks();
          fetchInventory();
        }
      }
    });
  };

  const handleBuyToInventory = async (packId: string, useGems: boolean, packName: string, cost: number, count: number = 1) => {
    if (!profile) return;
    
    setConfirmConfig({
      isOpen: true,
      title: count > 1 ? `Stash ${count} Packs` : 'Stash Pack',
      message: `Are you sure you want to stash ${count > 1 ? `${count}x ` : ''}${packName} for ${cost * count} ${useGems ? 'Gems' : 'Gold'}?`,
      variant: 'info',
      onConfirm: async () => {
        const toastId = toast.loading(`Stashing ${count > 1 ? `${count}x ` : ''}${packName}...`);
        try {
          // Process sequentially to avoid dropping requests if bulk isn't natively supported
          for (let i = 0; i < count; i++) {
            const { error } = await supabase.rpc('buy_pack_to_inventory', {
              p_pack_type_id: packId,
              p_use_gems: useGems
            });
            if (error) throw error;
          }
          
          toast.success(`${count > 1 ? `${count}x ` : ''}Pack${count > 1 ? 's' : ''} added to inventory!`, { id: toastId, icon: '📦' });
          fetchInventory();
          useProfileStore.getState().refreshProfile();
        } catch (err: any) {
          toast.error(err.message || 'Failed to buy pack', { id: toastId });
        }
      }
    });
  };

  const handleOpenFromInventory = async (inventoryId: string, packImageUrl: string) => {
    if (opening || !profile) return;
    setOpening(true);
    setOpeningPackImageUrl(packImageUrl);
    setPackOpeningStep('shaking');
    setBulkProgress(null);

    try {
      const { data, error } = await supabase.rpc('open_pack_from_inventory', {
        p_inventory_id: inventoryId
      });

      if (error) throw error;
      
      setOpenedCards(data.cards);
      
      // Update missions & quests
      supabase.rpc('increment_mission_progress', { p_mission_type: 'open_packs', p_amount: 1 });

      if (data.is_god_pack) {
        setShowGodPackCinematic(true);
        audioService.play('god_pack_alarm');
        toast.success('⚡ GOD PACK! All cards are Super-Rare or better!', {
          duration: 10000,
          icon: '🌟',
          style: { background: '#ffdf6c', fontWeight: 'bold', border: '4px solid black' }
        });
      }

      setOpeningSummary({ 
        xp_gained: data.xp_gained, 
        new_card_count: data.new_card_count,
        pack_points_earned: data.pack_points_earned
      });
      
      // Check achievements after pack open
      supabase.rpc('check_and_unlock_achievements').then(({ error }) => {
        if (error) console.error('Achievement check failed:', error);
      });

      // Show results sooner
      setTimeout(() => {
        setPackOpeningStep(current => current === 'shaking' ? 'revealing' : current);
        audioService.play('pack_open');
      }, 1000);

      setLastPackResults({ cards: data.cards, summary: { xp_gained: data.xp_gained, new_card_count: data.new_card_count } });
    } catch (err: any) {
      toast.error(err.message || 'Failed to open pack');
      setPackOpeningStep('idle');
    } finally {
      setOpening(false);
      useProfileStore.getState().refreshProfile();
      fetchPacks();
      fetchInventory();
    }
  };


  const handleOpenBulkFromInventoryByType = async (inv: any, count: number) => {
    if (opening || !profile) return;
    setOpening(true);
    setPackOpeningStep('shaking');
    setBulkProgress(null);
    setOpeningPackImageUrl(inv.image_url);
    
    try {
      let allCards: any[] = [];
      let totalXp = 0;
      let totalNew = 0;
      let totalPoints = 0;
      let hasGodPack = false;
      
      setBulkProgress({ current: 0, total: count });
      let packCount = 0;

      for (let i = 0; i < count; i++) {
        const { data, error } = await supabase.rpc('open_pack_from_inventory_by_type', {
          p_pack_type_id: inv.pack_type_id
        });
        if (error) throw error;
        
        allCards = [...allCards, ...data.cards];
        totalXp += data.xp_gained;
        totalNew += data.new_card_count;
        totalPoints += data.pack_points_earned || 0;

        // Update missions & quests
        supabase.rpc('increment_mission_progress', { p_mission_type: 'open_packs', p_amount: 1 });

        if (data.is_god_pack && !hasGodPack) {
          hasGodPack = true;
          setShowGodPackCinematic(true);
          audioService.play('god_pack_alarm');
        }

        packCount++;
        setBulkProgress({ current: packCount, total: count });
      }

      setOpenedCards(allCards);
      setOpeningSummary({ 
        xp_gained: totalXp, 
        new_card_count: totalNew,
        pack_points_earned: totalPoints
      });

      supabase.rpc('check_and_unlock_achievements').then(({ error }) => {
        if (error) console.error('Achievement check failed:', error);
      });

      if (!hasGodPack) {
        setTimeout(() => {
          setPackOpeningStep(current => current === 'shaking' ? 'revealing' : current);
          audioService.play('pack_open');
        }, 1000);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to open packs');
      setPackOpeningStep('idle');
    } finally {
      setOpening(false);
      useProfileStore.getState().refreshProfile();
      fetchInventory();
    }
  };

  const handleOpenAllFromInventory = async () => {
    if (opening || !profile || inventory.length === 0) return;
    setOpening(true);
    setPackOpeningStep('shaking');
    setBulkProgress(null);
    setOpeningPackImageUrl(inventory[0]?.image_url || '');
    
    try {
      let allCards: any[] = [];
      let totalXp = 0;
      let totalNew = 0;
      let totalPoints = 0;
      let hasGodPack = false;
      
      const totalPacks = inventory.reduce((acc, inv) => acc + (inv.quantity || 0), 0);
      setBulkProgress({ current: 0, total: totalPacks });
      let packCount = 0;

      // Open all packs sequentially to avoid race conditions on inventory quantity
      for (const inv of inventory) {
        for (let i = 0; i < (inv.quantity || 0); i++) {
          const { data, error } = await supabase.rpc('open_pack_from_inventory_by_type', {
            p_pack_type_id: inv.pack_type_id
          });
          if (error) throw error;
          
          allCards = [...allCards, ...data.cards];
          totalXp += data.xp_gained;
          totalNew += data.new_card_count;
          totalPoints += data.pack_points_earned || 0;

          // Update missions & quests
          supabase.rpc('increment_mission_progress', { p_mission_type: 'open_packs', p_amount: 1 });

          if (data.is_god_pack && !hasGodPack) {
            hasGodPack = true;
            setShowGodPackCinematic(true);
            audioService.play('god_pack_alarm');
          }

          packCount++;
          setBulkProgress({ current: packCount, total: totalPacks });
        }
      }
      
      if (hasGodPack) {
        setShowGodPackCinematic(true);
        audioService.play('god_pack_alarm');
      }

      setOpenedCards(allCards);
      setOpeningSummary({ 
        xp_gained: totalXp, 
        new_card_count: totalNew,
        pack_points_earned: totalPoints
      });
      
      setTimeout(() => {
        setPackOpeningStep(current => current === 'shaking' ? 'revealing' : current);
        audioService.play('pack_open');
      }, 1000);

      setLastPackResults({ 
        cards: allCards, 
        summary: { 
          xp_gained: totalXp, 
          new_card_count: totalNew,
          pack_points_earned: totalPoints
        } 
      });
      
      // Check achievements after bulk open
      supabase.rpc('check_and_unlock_achievements').then(({ error }) => {
        if (error) console.error('Achievement check failed:', error);
      });

      // Notify missions update
      window.dispatchEvent(new CustomEvent('missions_updated'));

      // Refresh inventory
      fetchInventory();
    } catch (err: any) {
      toast.error(err.message || 'Failed to open all packs');
      setPackOpeningStep('idle');
    } finally {
      setOpening(false);
      useProfileStore.getState().refreshProfile();
    }
  };

  const handleBuyShopItem = async (item: any) => {
    if (!profile) return;
    
    const isFreeItem = (item.cost_gold === 0 || item.cost_gold === null) 
                    && (item.cost_gems === 0 || item.cost_gems === null);
    const useGems = !isFreeItem && (item.cost_gems ?? 0) > 0 && (item.cost_gold ?? 0) === 0;

    setConfirmConfig({
      isOpen: true,
      title: 'Buy Item',
      message: `Are you sure you want to buy ${item.name} for ${isFreeItem ? 'Free' : (item.cost_gold ?? 0) > 0 ? `${item.cost_gold} Gold` : `${item.cost_gems ?? 0} Gems`}?`,
      variant: 'info',
      onConfirm: async () => {
        try {
          const { data, error } = await supabase.rpc('buy_shop_item', {
            p_shop_item_id: item.id,
            p_use_gems: useGems
          });

          if (error || data?.success === false) {
            throw new Error(data?.error || error?.message || 'Failed to purchase item');
          }
          
          toast.success(`${item.name} purchased!`, { icon: '🛍️' });
          useProfileStore.getState().refreshProfile();
          fetchUserCosmetics();
        } catch (err: any) {
          toast.error(err.message || 'Failed to buy item');
        }
      }
    });
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

  const handleSparkCard = async (rarity: string, cost: number) => {
    if (!profile || ((profile?.pack_points ?? 0) < cost)) {
      toast.error('Not enough pack points!');
      return;
    }

    setConfirmConfig({
      isOpen: true,
      title: 'Spark Card',
      message: `Spark a random ${rarity} card for ${cost} pts?`,
      variant: 'info',
      onConfirm: async () => {
        setOpening(true);
        setPackOpeningStep('shaking');
        setBulkProgress(null);
        // Placeholder image for spark
        setOpeningPackImageUrl('https://cdn.midjourney.com/77de7f93-c2aa-4265-8c45-b4a9784e689c/0_3.png');

        try {
          const { data, error } = await supabase.rpc('spark_card', {
            p_rarity: rarity
          });

          if (error) throw error;
          if (data?.success === false) throw new Error(data.error || 'Spark failed');

          setOpenedCards([{ ...data.card }]);
          setOpeningSummary({ xp_gained: data.xp_gained, new_card_count: data.new_card_count });
          
          setTimeout(() => {
            setPackOpeningStep(current => current === 'shaking' ? 'revealing' : current);
            audioService.play('pack_open');
          }, 1000);

        } catch (err: any) {
          toast.error(err.message || 'Failed to spark card');
          setPackOpeningStep('idle');
        } finally {
          setOpening(false);
          useProfileStore.getState().refreshProfile();
        }
      }
    });
  };

  const renderPackCard = (pack: any) => {
    const isDualCost = (pack.cost_gold ?? 0) > 0 && (pack.cost_gems ?? 0) > 0;
    const useGems = isDualCost ? (cosmicUseGems[pack.id] ?? false) : (pack.cost_gems > 0 && !((pack.cost_gold ?? 0) > 0));
    const cost = useGems ? pack.cost_gems : pack.cost_gold;
    const balance = useGems ? (profile?.gem_balance ?? 0) : (profile?.gold_balance ?? 0);
    const canAfford = balance >= cost;

    return (
      <motion.div 
        key={pack.id}
        whileHover={{ y: -4, rotate: -1 }}
        className={cn(
          "bg-[var(--surface)] border-4 border-[var(--border)] rounded-2xl overflow-hidden relative group shadow-[8px_8px_0px_0px_var(--border)] flex flex-col",
          pack.pack_tier === 'booster_box' && "border-yellow-500 scale-[1.02] shadow-[12px_12px_0px_0px_rgba(234,179,8,0.2)]",
          pack.pack_tier === 'collector' && "border-red-500 shadow-[12px_12px_0px_0px_rgba(239,68,68,0.2)]",
          pack.pack_tier === 'premium' && "border-purple-500 shadow-[12px_12px_0px_0px_rgba(168,85,247,0.2)]",
          !canAfford && "opacity-60"
        )}
      >
        <div className={cn(
          "aspect-[4/3] relative border-b-4 border-[var(--border)] overflow-hidden",
          pack.pack_tier === 'booster_box' ? "bg-yellow-50" : pack.pack_tier === 'collector' ? "bg-red-50" : pack.pack_tier === 'premium' ? "bg-purple-50" : "bg-blue-100"
        )}>
          {/* God Pack Odds */}
          <div className="absolute top-2 left-2 bg-[#1a1a2e] text-yellow-400 text-[10px] font-black px-2 py-0.5 rounded-full border border-yellow-400/50 uppercase tracking-tighter z-30 flex items-center gap-1 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <Zap className="w-3 h-3 fill-current" />
            1:2000 GOD PACK
          </div>

          {profile?.soft_pity_counter >= 50 && (
            <div className="absolute top-10 left-2 z-30 px-2 py-1 bg-orange-500 text-white text-[10px] font-black uppercase rounded-full border-2 border-black animate-pulse shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              ⚡ Mythic Boost Active!
            </div>
          )}

          {(pack.pack_tier === 'collector' || pack.pack_tier === 'booster_box') && (
            <div className="absolute top-2 right-2 z-30 badge-foil px-2 py-1 text-[9px] font-black uppercase rounded-full border-2 border-black text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              ✨ All Foil
            </div>
          )}

          {pack.pack_tier === 'collector' && (
            <div className="absolute top-[75px] left-2 bg-yellow-400 text-black text-[10px] font-black px-2 py-0.5 rounded-full border-2 border-black uppercase tracking-widest z-10 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              Collector
            </div>
          )}
          {pack.pack_tier === 'premium' && (
            <div className="absolute top-[75px] left-2 bg-purple-400 text-white text-[10px] font-black px-2 py-0.5 rounded-full border-2 border-black uppercase tracking-widest z-10 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              Premium
            </div>
          )}
          {pack.pack_tier === 'booster_box' && (
            <div className="absolute top-[75px] left-2 bg-yellow-400 text-black text-[10px] font-black px-2 py-0.5 rounded-full border-2 border-black uppercase tracking-widest z-10 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              Bulk Value
            </div>
          )}

          {pack.image_url ? (
            <img
              src={pack.image_url}
              alt={pack.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              referrerPolicy="no-referrer"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-100 to-purple-100">
              <Package className="w-16 h-16 text-indigo-300 opacity-50" />
            </div>
          )}

          {/* All Foil Banner on Hover */}
          {(pack.pack_tier === 'collector' || pack.name.toLowerCase().includes('legendary')) && (
            <div className="absolute inset-x-0 bottom-0 bg-yellow-400 text-black text-[10px] font-black py-1 text-center uppercase tracking-[0.2em] transform translate-y-full group-hover:translate-y-0 transition-transform z-20 border-t-2 border-black">
              ✨ All Foil ✨
            </div>
          )}
        </div>

        <div className="p-6 flex flex-col flex-1">
          <div className="flex items-start justify-between mb-2">
            <h3 className="text-2xl font-black text-[var(--text)] uppercase">{pack.name}</h3>
            <div className="flex flex-col items-end gap-1">
              <div className="bg-blue-500 text-white px-3 py-1 rounded-lg border-2 border-black text-[10px] font-black uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                {pack.card_count} Cards
              </div>
            </div>
          </div>

          <div className="mt-4 space-y-1">
             <div className="flex justify-between text-[10px] font-black uppercase text-slate-400">
                <span>Set: {pack.description?.split('.')[0] || 'Base Set'}</span>
             </div>
          </div>
          
          <p className="text-sm text-slate-600 font-bold mb-4 line-clamp-2 mt-4">
             {pack.description?.replace(/Only 200 copies available per Mythic\/Divine card\.?/i, 'Serialized Edition: 1-in-500 chance per pull.')}
          </p>
          
          <button onClick={() => setShowOdds(prev => ({...prev, [pack.id]: !prev[pack.id]}))}
            className="text-xs text-slate-500 font-bold underline mb-2 w-fit">
            {showOdds[pack.id] ? 'Hide Slot Odds' : 'View Slot Odds'}
          </button>
          {showOdds[pack.id] && pack.slot_config && (
            <SlotBreakdown slotConfig={pack.slot_config} />
          )}

          <div className="flex flex-col gap-3 mt-auto pt-4">
            {isDualCost && (
              <div className="flex gap-2 mb-2 p-1 bg-slate-100 rounded-xl border-2 border-black">
                <button onClick={() => setCosmicUseGems(prev => ({ ...prev, [pack.id]: false }))}
                  className={cn(
                    "flex-1 py-1.5 rounded-lg text-xs font-black uppercase transition-all",
                    !useGems ? "bg-yellow-400 text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] border-2 border-black" : "text-slate-500"
                  )}>
                  Gold
                </button>
                <button onClick={() => setCosmicUseGems(prev => ({ ...prev, [pack.id]: true }))}
                  className={cn(
                    "flex-1 py-1.5 rounded-lg text-xs font-black uppercase transition-all",
                    useGems ? "bg-emerald-400 text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] border-2 border-black" : "text-slate-500"
                  )}>
                  Gems
                </button>
              </div>
            )}

            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                <button 
                  onClick={() => handleOpenPack(pack.id, useGems, pack.image_url, pack.name, cost)}
                  disabled={opening || balance < cost}
                  className={cn(
                    "flex-1 font-black py-2 px-2 rounded-xl border-4 border-black transition-transform active:translate-y-1 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center gap-1 text-sm",
                    useGems ? "bg-emerald-500 hover:bg-emerald-600 text-black" : "bg-blue-500 hover:bg-blue-600 text-white",
                    balance < cost && "opacity-50 cursor-not-allowed"
                  )}
                >
                  <span>{useGems ? <Gem className="w-3 h-3 inline" /> : <Coins className="w-3 h-3 inline" />} {cost?.toLocaleString()} Open</span>
                </button>
                <button 
                  onClick={() => handleBuyToInventory(pack.id, useGems, pack.name, cost)}
                  disabled={opening || balance < cost}
                  className={cn(
                    "flex-1 font-black py-2 px-2 rounded-xl border-4 border-[var(--border)] transition-transform active:translate-y-1 shadow-[4px_4px_0px_0px_var(--border)] flex items-center justify-center gap-1 text-sm",
                    useGems ? "bg-emerald-100 hover:bg-emerald-200 text-emerald-800" : "bg-slate-100 hover:bg-slate-200 text-slate-800",
                    balance < cost && "opacity-50 cursor-not-allowed"
                  )}
                >
                  <PackageOpen className="w-4 h-4" /> Stash
                </button>
              </div>

              {pack.pack_tier !== 'collector' && pack.pack_tier !== 'premium' && (
                <div className="grid grid-cols-2 gap-2">
                  <button 
                    onClick={() => handleBuyToInventory(pack.id, useGems, pack.name, cost, 5)}
                    disabled={opening || balance < cost * 5}
                    className={cn(
                      "font-black py-2 rounded-xl border-4 border-black transition-transform active:translate-y-1 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center gap-2 text-sm",
                      useGems ? "bg-emerald-500 hover:bg-emerald-600 text-black" : "bg-cyan-500 hover:bg-cyan-600 text-black",
                      balance < cost * 5 && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    Stash 5x
                  </button>
                  <button 
                    onClick={() => handleBuyToInventory(pack.id, useGems, pack.name, cost, 10)}
                    disabled={opening || balance < cost * 10}
                    className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black py-2 rounded-xl border-4 border-black transition-transform active:translate-y-1 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center gap-2 text-sm"
                  >
                    Stash 10x
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    );
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
            <div key={i} className="skeleton-card">
              <div className="absolute inset-0 p-6 flex flex-col">
                <div className="h-48 bg-slate-200/50 rounded-xl mb-6"></div>
                <div className="h-8 w-3/4 bg-slate-300/50 rounded-lg mb-4"></div>
                <div className="h-4 w-full bg-slate-300/50 rounded-md mb-2"></div>
                <div className="h-4 w-5/6 bg-slate-300/50 rounded-md"></div>
                <div className="mt-auto flex gap-4">
                  <div className="h-12 flex-[2] bg-slate-300/50 rounded-xl"></div>
                  <div className="h-12 flex-1 bg-slate-300/50 rounded-xl"></div>
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-4xl font-black text-[var(--text)] tracking-tight uppercase">Store</h1>
        
        {profile && (
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 text-white px-4 py-2 rounded-xl flex items-center gap-2 border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <Sparkles className="w-5 h-5" />
              <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase opacity-70">Pack Points</span>
                <span className="text-lg font-black leading-none">{profile.pack_points?.toLocaleString() || 0} pts</span>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-yellow-400 text-black px-4 py-2 rounded-xl border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <Coins className="w-5 h-5" />
              <span className="text-lg font-black leading-none">{profile.gold_balance?.toLocaleString() || 0}</span>
            </div>
            <div className="flex items-center gap-2 bg-emerald-400 text-black px-4 py-2 rounded-xl border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <Gem className="w-5 h-5" />
              <span className="text-lg font-black leading-none">{profile.gem_balance?.toLocaleString() || 0}</span>
            </div>
          </div>
        )}
      </div>
      
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
      {activeTab === 'packs' && (
        <div className="space-y-12">
          {/* Global Pity Progress Section */}
          <div className="bg-[var(--surface)] border-4 border-black rounded-2xl p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] relative overflow-hidden">
             <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 blur-[80px] -translate-y-1/2 translate-x-1/2 rounded-full" />
             <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-1">
                   <h2 className="text-2xl font-black uppercase text-[var(--text)] tracking-tight flex items-center gap-2">
                      <Target className="w-6 h-6 text-indigo-500" />
                      Global Pity Tracker
                   </h2>
                   <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Progress counts across ALL standard packs</p>
                </div>

                <div className="flex-1 max-w-2xl grid grid-cols-1 sm:grid-cols-2 gap-6">
                   {packs.length > 0 && (
                     <>
                        <div className="space-y-2">
                           <div className="flex justify-between text-[10px] font-black uppercase text-slate-500">
                             <span className="flex items-center gap-1 text-purple-600">
                               <Star className="w-3 h-3 fill-current" />
                               SR+ Guaranteed
                             </span>
                             <span className="text-[var(--text)]">{profile?.pity_counter ?? 0}/100</span>
                           </div>
                           <div className="h-4 bg-slate-100 rounded-full border-2 border-black overflow-hidden shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)]">
                             <motion.div 
                               initial={{ width: 0 }}
                               animate={{ width: `${((profile?.pity_counter ?? 0) / 100) * 100}%` }}
                               className="h-full bg-gradient-to-r from-purple-500 to-indigo-600 relative"
                             >
                                <div className="absolute inset-0 bg-white/20 animate-pulse" />
                             </motion.div>
                           </div>
                        </div>

                        <div className="space-y-2">
                           <div className="flex justify-between text-[10px] font-black uppercase text-slate-500">
                             <span className="flex items-center gap-1 text-orange-600">
                               <Zap className="w-3 h-3 fill-current" />
                               Mythic Boost
                             </span>
                             <span className="text-[var(--text)]">{profile?.soft_pity_counter ?? 0}/50</span>
                           </div>
                           <div className="h-4 bg-slate-100 rounded-full border-2 border-black overflow-hidden shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)]">
                             <motion.div 
                               initial={{ width: 0 }}
                               animate={{ width: `${((profile?.soft_pity_counter ?? 0) / 50) * 100}%` }}
                               className="h-full bg-gradient-to-r from-orange-500 to-red-600 relative"
                             >
                                <div className="absolute inset-0 bg-white/20 animate-pulse" />
                             </motion.div>
                           </div>
                        </div>
                     </>
                   )}
                </div>
             </div>
          </div>

          <AnimatePresence>
            {lastPackResults && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
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
                  {lastPackResults.summary.pack_points_earned !== undefined && (
                    <span className="text-indigo-500 flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      +{lastPackResults.summary.pack_points_earned} Pts
                    </span>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {packs.length === 0 ? (
            <div className="col-span-full">
              <EmptyState 
                icon={PackageOpen}
                title="No packs available"
                description="Check back later for new pack releases!"
                ctaText="Back to Home"
                ctaPath="/"
              />
            </div>
          ) : (
            <div className="space-y-12">
              {/* === BOOSTER BOX SECTION === */}
              {packs.filter(p => p.pack_tier === 'booster_box').length > 0 && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-black uppercase tracking-tight flex items-center gap-2">
                    <Package className="w-6 h-6 text-yellow-500" />
                    Booster Box
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-8">
                    {packs.filter(p => p.pack_tier === 'booster_box').map(pack => renderPackCard(pack))}
                  </div>
                </div>
              )}

              {/* Gold Packs Section */}
              {packs.filter(p => p.cost_gold > 0 && !(p.cost_gems > 0) && p.pack_tier === 'standard').length > 0 && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-black uppercase tracking-tight flex items-center gap-2">
                    <Coins className="w-6 h-6 text-yellow-500" />
                    Standard Packs
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-8">
                    {packs.filter(p => p.cost_gold > 0 && !(p.cost_gems > 0) && p.pack_tier === 'standard').map(pack => renderPackCard(pack))}
                  </div>
                </div>
              )}

              {/* Premium Section */}
              {packs.filter(p => p.pack_tier === 'premium').length > 0 && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-black uppercase tracking-tight flex items-center gap-2">
                    <Star className="w-6 h-6 text-purple-500" />
                    Premium Boxes
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-8">
                    {packs.filter(p => p.pack_tier === 'premium').map(pack => renderPackCard(pack))}
                  </div>
                </div>
              )}

              {/* Collector Section */}
              {packs.filter(p => p.pack_tier === 'collector').length > 0 && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-black uppercase tracking-tight flex items-center gap-2">
                    <Zap className="w-6 h-6 text-red-500" />
                    Collector Sets
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-8">
                    {packs.filter(p => p.pack_tier === 'collector').map(pack => renderPackCard(pack))}
                  </div>
                </div>
              )}

              {/* Gem Packs & Specialty Section */}
              {packs.filter(p => (p.cost_gems > 0) && !['collector', 'premium', 'booster_box'].includes(p.pack_tier)).length > 0 && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-black uppercase tracking-tight flex items-center gap-2">
                    <Gem className="w-6 h-6 text-emerald-500" />
                    Specialty & Gem Packs
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-8">
                    {packs.filter(p => (p.cost_gems > 0) && !['collector', 'premium', 'booster_box'].includes(p.pack_tier)).map(pack => renderPackCard(pack))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === 'spark' && (
        <div className="space-y-8">
          <div className="bg-indigo-900 border-4 border-black rounded-3xl p-8 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] text-white relative overflow-hidden">
             {/* Background glow */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/20 blur-[100px] -translate-y-1/2 translate-x-1/2 rounded-full" />
            
            <div className="relative z-10 max-w-2xl">
              <h2 className="text-4xl font-black uppercase italic tracking-tighter mb-4 flex items-center gap-3">
                <Sparkles className="w-10 h-10 text-yellow-400 animate-pulse" />
                The Spark
              </h2>
              <p className="text-indigo-200 text-lg font-bold mb-8 leading-relaxed">
                Use your Pack Points to spark specific rarities. Each spark guarantees a random card from the chosen rarity pool.
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {[
                  { rarity: 'Common', cost: 100, color: 'bg-slate-500' },
                  { rarity: 'Uncommon', cost: 200, color: 'bg-green-500' },
                  { rarity: 'Rare', cost: 1000, color: 'bg-blue-500' },
                  { rarity: 'Super-Rare', cost: 3000, color: 'bg-purple-500' },
                  { rarity: 'Mythic', cost: 10000, color: 'bg-yellow-500' },
                  { rarity: 'Divine', cost: 50000, color: 'bg-red-500' },
                ].map((item) => (
                  <button
                    key={item.rarity}
                    onClick={() => handleSparkCard(item.rarity, item.cost)}
                    disabled={(profile?.pack_points ?? 0) < item.cost}
                    className={cn(
                      "group bg-indigo-800/50 border-4 border-black p-6 rounded-2xl text-left transition-all hover:translate-y-[-4px] active:translate-y-0 relative overflow-hidden",
                      (profile?.pack_points ?? 0) >= item.cost ? "hover:bg-indigo-700/50 cursor-pointer shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]" : "opacity-50 cursor-not-allowed"
                    )}
                  >
                    <div className={cn("w-12 h-1.5 rounded-full mb-4", item.color)} />
                    <h4 className="text-xl font-black uppercase mb-1">{item.rarity}</h4>
                    <p className="text-indigo-300 font-bold flex items-center gap-2 mb-2">
                       <Sparkles className="w-4 h-4" />
                       {item.cost.toLocaleString()} pts
                    </p>
                    {collectionStats && collectionStats.rarity_counts && collectionStats.rarity_counts[item.rarity] && (
                      <div className="flex justify-between items-center bg-black/40 px-3 py-1.5 rounded-lg border border-black/20 text-xs font-black uppercase tracking-wider text-indigo-200">
                        <span>Owned</span>
                        <span className={cn(
                          "px-2 py-0.5 rounded border border-current",
                          collectionStats.rarity_counts[item.rarity].owned >= collectionStats.rarity_counts[item.rarity].total ? "text-emerald-400" : "text-white"
                        )}>{collectionStats.rarity_counts[item.rarity].owned || 0} / {collectionStats.rarity_counts[item.rarity].total || '?'}
                        </span>
                      </div>
                    )}
                    
                    {(profile?.pack_points ?? 0) >= item.cost && (
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Plus className="w-5 h-5 text-indigo-400" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
             <div className="bg-[var(--surface)] border-4 border-[var(--border)] rounded-2xl p-6 shadow-[8px_8px_0px_0px_var(--border)]">
                <h3 className="text-2xl font-black uppercase mb-4 flex items-center gap-2">
                   <Target className="w-6 h-6 text-indigo-500" />
                   How to earn points?
                </h3>
                <ul className="space-y-4 font-bold text-slate-600">
                   <li className="flex gap-3">
                      <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center border-2 border-indigo-200 shrink-0 mt-0.5">1</div>
                      <p>Open any pack in the store to earn base points.</p>
                   </li>
                   <li className="flex gap-3">
                      <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center border-2 border-indigo-200 shrink-0 mt-0.5">2</div>
                      <p>Unlock higher rarity cards for bonus points.</p>
                   </li>
                   <li className="flex gap-3">
                      <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center border-2 border-indigo-200 shrink-0 mt-0.5">3</div>
                      <p>Collector packs grant significantly more points per card.</p>
                   </li>
                </ul>
             </div>
             
             <div className="bg-gradient-to-br from-indigo-500 to-purple-600 border-4 border-black rounded-2xl p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] text-white">
                <h3 className="text-2xl font-black uppercase mb-4 flex items-center gap-2">
                   <Award className="w-6 h-6" />
                   Spark Pool
                </h3>
                <p className="font-bold opacity-90 leading-relaxed mb-6">
                   Each rarity pool contains all released cards of that tier. Sparking is the best way to fill missing gaps in your collection once you've accumulated enough points.
                </p>
                <div className="p-4 bg-black/20 rounded-xl border-2 border-white/20">
                   <p className="text-xs font-black uppercase tracking-widest leading-loose">
                      Pools updated weekly with new card releases. All rarities available to spark — costs scale with rarity.
                   </p>
                </div>
             </div>
          </div>
        </div>
      )}

      {activeTab === 'shop' && (
        <ShopSection
          shopItems={shopItems}
          profile={profile}
          userCosmetics={userCosmetics}
          onBuyItem={handleBuyShopItem}
        />
      )}
      {activeTab === 'inventory' && (
        <div className="space-y-8">
          <div className="bg-[var(--surface)] border-4 border-[var(--border)] rounded-2xl p-6 shadow-[8px_8px_0px_0px_var(--border)]">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-black text-[var(--text)] flex items-center gap-2 uppercase">
                <PackageOpen className="w-6 h-6 text-blue-500" />
                Stashed Packs
              </h2>
                <div className="flex items-center gap-4">
                  <div className="hidden sm:flex flex-col items-end">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Vault Capacity</p>
                    <p className="text-xs font-black text-[var(--text)]">
                      {inventory.reduce((acc, inv) => acc + inv.quantity, 0)} / 999 Packs
                    </p>
                  </div>
                  {inventory.length > 0 && (
                    <button 
                      onClick={handleOpenAllFromInventory}
                      disabled={opening}
                      className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white font-black rounded-xl border-4 border-[var(--border)] transition-transform active:translate-y-1 shadow-[4px_4px_0px_0px_var(--border)] flex items-center gap-2 text-sm uppercase tracking-widest"
                    >
                      Open All
                    </button>
                  )}
                </div>
            </div>

            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
              </div>
            ) : inventory.length === 0 ? (
              <div className="text-center py-12 bg-[var(--bg)] rounded-xl border-2 border-dashed border-[var(--border)]">
                <p className="text-slate-500 font-bold">No packs in inventory.</p>
                <p className="text-xs text-slate-400 mt-1 uppercase tracking-widest">Buy some from the shop and stash them!</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-x-6 gap-y-10">
                {inventory.map((inv) => (
                  <div key={inv.pack_type_id} className="relative group">
                    {/* Stack Deco - Visual layers for quantity */}
                    {inv.quantity > 1 && (
                      <div className="absolute inset-0 translate-x-1.5 translate-y-1.5 bg-[var(--bg)] border-4 border-[var(--border)] rounded-2xl -z-10" />
                    )}
                    {inv.quantity > 2 && (
                      <div className="absolute inset-0 translate-x-3 translate-y-3 bg-[var(--bg)] border-4 border-[var(--border)] rounded-2xl -z-20 opacity-50" />
                    )}

                    <div 
                      className={cn(
                        "relative h-full bg-[var(--bg)] border-4 border-[var(--border)] rounded-2xl overflow-hidden shadow-[4px_4px_0px_0px_var(--border)] hover:translate-y-[-2px] transition-all flex flex-col",
                        inv.pack_tier === 'booster_box' && "border-yellow-500 shadow-[4px_4px_0px_0px_rgba(234,179,8,1)]",
                        inv.pack_tier === 'collector' && "border-red-500 shadow-[4px_4px_0px_0px_rgba(239,68,68,1)]"
                      )}
                    >
                      <div className="aspect-[3/4] overflow-hidden border-b-4 border-[var(--border)] bg-indigo-50 relative">
                        <img
                          src={inv.image_url}
                          alt={inv.name}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                          referrerPolicy="no-referrer"
                        />
                        {/* Quantity Badge */}
                        <div className="absolute top-2 right-2 bg-black text-white text-[11px] font-black px-2 py-0.5 rounded-full border-2 border-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] z-10">
                          ×{inv.quantity}
                        </div>
                        
                        {/* Tier Badge */}
                        {inv.pack_tier && inv.pack_tier !== 'regular' && (
                          <div className={cn(
                            "absolute bottom-2 left-2 px-1.5 py-0.5 rounded border-2 border-black text-[9px] font-black uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]",
                            inv.pack_tier === 'booster_box' ? "bg-yellow-400" : "bg-purple-400 text-white"
                          )}>
                            {inv.pack_tier.replace('_', ' ')}
                          </div>
                        )}
                      </div>
                      
                      <div className="p-3 text-center flex-1 flex flex-col justify-between gap-3">
                        <div className="min-h-[2.5rem] flex items-center justify-center">
                          <p className="font-black text-[11px] uppercase leading-tight text-[var(--text)] line-clamp-2">{inv.name}</p>
                        </div>
                        
                        <div className="flex flex-col gap-2">
                          <button
                            onClick={() => handleOpenFromInventory(inv.id, inv.image_url)}
                            disabled={opening}
                            className="w-full py-2 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white font-black rounded-xl border-4 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-transform active:translate-y-0.5 active:shadow-none uppercase text-[10px]"
                          >
                            Open
                          </button>
                          {inv.quantity >= 5 && (
                            <div className="grid grid-cols-2 gap-2">
                              <button
                                onClick={() => handleOpenBulkFromInventoryByType(inv, 5)}
                                disabled={opening}
                                className="py-1.5 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white font-black rounded-lg border-2 border-black transition-transform active:translate-y-0.5 uppercase text-[9px]"
                              >
                                5x
                              </button>
                              <button
                                onClick={() => handleOpenBulkFromInventoryByType(inv, Math.min(10, inv.quantity))}
                                disabled={opening || inv.quantity < 10}
                                className="py-1.5 bg-purple-500 hover:bg-purple-600 disabled:opacity-50 text-white font-black rounded-lg border-2 border-black transition-transform active:translate-y-0.5 uppercase text-[9px] disabled:opacity-50"
                              >
                                10x
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
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
              useProfileStore.getState().refreshProfile();
              fetchPacks();
              fetchInventory();
            }}
            className="absolute top-4 right-4 text-white/60 hover:text-white font-black text-2xl z-[110]"
          >
            ✕
          </button>
          
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
                className="w-64 aspect-[4/3] rounded-xl border-4 border-yellow-400 overflow-hidden shadow-[0_0_40px_rgba(250,204,21,0.6)] relative"
              >
                <img src={openingPackImageUrl} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                  <p className="text-white font-black text-xs uppercase opacity-0 group-hover:opacity-100 transition-opacity">Click to Skip</p>
                </div>
              </motion.div>
              <motion.p 
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 0.8, repeat: Infinity }}
                className="text-yellow-400 font-black text-2xl uppercase tracking-widest text-center"
              >
                {openedCards && openedCards.length > 0 ? (
                  <motion.div 
                    initial={{ scale: 0.9 }}
                    animate={{ scale: [0.9, 1.1, 0.9] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    className="text-yellow-400 flex flex-col items-center gap-1"
                  >
                    <span className="text-4xl text-green-400">READY!</span>
                    <span className="text-sm italic text-white tracking-widest bg-black/40 px-6 py-1 rounded-full border border-white/10 shadow-xl">
                      TAP TO REVEAL {openedCards.length} CARDS
                    </span>
                  </motion.div>
                ) : (
                  <div className="flex flex-col items-center gap-4">
                     <span className="animate-pulse">Opening...</span>
                     {bulkProgress && bulkProgress.total > 1 && (
                       <div className="flex flex-col items-center gap-2">
                        <div className="w-64 h-3 bg-white/10 rounded-full overflow-hidden p-1 border border-white/10 shadow-inner">
                          <motion.div 
                            className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${(bulkProgress.current / bulkProgress.total) * 100}%` }}
                            transition={{ type: 'spring', bounce: 0, duration: 0.3 }}
                          />
                        </div>
                        <span className="text-xs font-mono text-white/60 bg-black/40 px-3 py-1 rounded-md border border-white/5">
                          SECURED {bulkProgress.current} / {bulkProgress.total} PACKS
                        </span>
                       </div>
                     )}
                  </div>
                )}
              </motion.p>
              <p className="text-white/40 text-sm font-bold">tap to skip</p>
            </div>
          )}

          {packOpeningStep === 'revealing' && openedCards && (
            <PackOpeningFan
              isOpen={true}
              cards={openedCards}
              summary={openingSummary}
              onClose={() => {
                setPackOpeningStep('idle');
                setOpening(false);
                setOpenedCards(null);
                setOpeningSummary(null);
                useProfileStore.getState().refreshProfile();
                fetchPacks();
                fetchInventory();
              }}
            />
          )}
        </div>
      )}

      {/* God Pack Cinematic Overlay */}
      <AnimatePresence>
        {showGodPackCinematic && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/90 flex flex-col items-center justify-center p-4 overflow-hidden"
            onClick={() => {
              setShowGodPackCinematic(false);
              if (packOpeningStep === 'shaking' && openedCards && openedCards.length > 0) {
                setPackOpeningStep('revealing');
                audioService.play('pack_open');
              }
            }}
          >
            {/* Pulsing Backlight */}
            <motion.div 
              animate={{ 
                scale: [1, 1.5, 1],
                opacity: [0.3, 0.6, 0.3]
              }}
              transition={{ duration: 2, repeat: Infinity }}
              className="absolute w-[800px] h-[800px] rounded-full bg-yellow-400/20 blur-[120px]"
            />

            <motion.div
              initial={{ scale: 0.5, y: 100, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              transition={{ type: "spring", damping: 12 }}
              className="relative z-10 text-center"
            >
              <div className="inline-block">
                <h2 className="text-8xl md:text-9xl font-black italic uppercase tracking-tighter text-yellow-400 drop-shadow-[0_10px_0px_rgba(0,0,0,1)] flex items-center justify-center gap-4">
                  <Sparkles className="w-20 h-20 animate-pulse" />
                  GOD PACK!
                  <Sparkles className="w-20 h-20 animate-pulse" />
                </h2>
              </div>
              
              <div className="mt-8 flex flex-col gap-4">
                <p className="text-2xl font-black text-white uppercase tracking-widest animate-bounce">
                  All Super-Rare or Higher!
                </p>
                <div className="flex justify-center gap-2">
                   {Array.from({ length: 5 }).map((_, i) => (
                      <motion.div 
                        key={i}
                        animate={{ y: [0, -20, 0], rotate: [0, 360] }}
                        transition={{ duration: 1, delay: i * 0.1, repeat: Infinity }}
                        className="text-4xl"
                      >
                         ✨
                      </motion.div>
                   ))}
                </div>
              </div>
              
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setShowGodPackCinematic(false);
                  if (packOpeningStep === 'shaking' && openedCards && openedCards.length > 0) {
                    setPackOpeningStep('revealing');
                    audioService.play('pack_open');
                  }
                }}
                className="mt-16 px-12 py-6 bg-white text-black font-black text-2xl rounded-2xl border-8 border-black shadow-[12px_12px_0px_0px_rgba(255,255,255,0.3)] hover:scale-110 active:scale-95 transition-all uppercase italic"
              >
                Reveal the Glory
              </button>
            </motion.div>

            {/* Particle Burst Simulation */}
            <div className="absolute inset-0 pointer-events-none">
               {Array.from({ length: 30 }).map((_, i) => (
                 <motion.div
                    key={i}
                    initial={{ x: "50%", y: "50%", opacity: 1 }}
                    animate={{ 
                      x: [`${Math.random() * 100}%`, `${Math.random() * 100}%`], 
                      y: [`${Math.random() * 100}%`, `${Math.random() * 100}%`],
                      opacity: [1, 0],
                      scale: [1, Math.random() * 2]
                    }}
                    transition={{ duration: 3, delay: Math.random() * 0.5, repeat: Infinity }}
                    className="absolute w-2 h-2 bg-yellow-400 rounded-full"
                 />
               ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {selectedCard && (
        <Card3DModal 
          card={selectedCard} 
          cardBackUrl={null}
          onClose={() => setSelectedCard(null)} 
        />
      )}

      <ConfirmModal
        isOpen={confirmConfig.isOpen}
        onClose={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmConfig.onConfirm}
        title={confirmConfig.title}
        message={confirmConfig.message}
        variant={confirmConfig.variant}
      />
    </div>
  );
}

