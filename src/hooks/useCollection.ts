import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useProfileStore } from '../stores/profileStore';
import toast from 'react-hot-toast';

export function useCollection(activeTab: 'collection' | 'wishlist' | 'sets', filters: any) {
  const { profile, collectionStats: stats, fetchCollectionStats } = useProfileStore();
  const [cards, setCards] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [wishlistCardIds, setWishlistCardIds] = useState<Set<string>>(new Set());
  const abortControllerRef = useRef<AbortController | null>(null);
  const offsetRef = useRef(0);
  const PAGE_SIZE = 20;

  const fetchStats = fetchCollectionStats;

  const fetchWishlistCardIds = useCallback(async () => {
    try {
      const { data, error } = await supabase.rpc('get_wishlist_card_ids');
      if (error) throw error;
      setWishlistCardIds(new Set(data || []));
    } catch (err) {
      console.error('Error fetching wishlist card ids:', err);
    }
  }, []);

  const fetchCollection = useCallback(async (isLoadMore = false) => {
    if (!profile) {
      setLoading(false);
      return;
    }
    
    // Abort previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const targetOffset = isLoadMore ? offsetRef.current : 0;
      
      if (!isLoadMore) {
        setLoading(true);
        setHasMore(true);
      } else {
        setLoadingMore(true);
      }

      const rarityForApi = filters.rarity === 'all' ? null : 
        filters.rarity.split('-').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join('-');
        
      const capitalizedCardType = filters.cardType === 'all' ? null : 
        filters.cardType.charAt(0).toUpperCase() + filters.cardType.slice(1);

      const { data, error } = await supabase.rpc('get_user_collection', {
        p_user_id: profile.id,
        p_set_id: filters.setId === 'all' ? null : filters.setId,
        p_rarity: rarityForApi,
        p_sort_by: filters.sortBy,
        p_card_type_filter: capitalizedCardType,
        p_is_foil: filters.foilFilter === 'all' ? null : filters.foilFilter === 'foil',
        p_limit: PAGE_SIZE,
        p_offset: targetOffset,
        p_search: filters.search || null,
        p_wishlist_only: activeTab === 'wishlist',
        p_low_serial_only: filters.lowSerialOnly || false,
        p_keyword: filters.keyword === 'all' ? null : filters.keyword
      }).abortSignal(controller.signal);
      
      if (error) throw error;
      
      const fetchedCards = data || [];
      if (isLoadMore) {
        setCards(prev => {
          const prevIds = new Set(prev.map(c => c.user_card_id || c.id));
          const newUniqueCards = fetchedCards.filter((c: any) => !prevIds.has(c.user_card_id || c.id));
          return [...prev, ...newUniqueCards];
        });
      } else {
        setCards(fetchedCards);
      }

      const newOffset = targetOffset + fetchedCards.length;
      offsetRef.current = newOffset;
      setHasMore(fetchedCards.length === PAGE_SIZE);

      // Mark unseen cards as seen
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
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      console.error('Error fetching collection:', err);
      toast.error('Failed to load collection. Please refresh.');
    } finally {
      if (abortControllerRef.current === controller) {
        setLoading(false);
        setLoadingMore(false);
      }
    }
  }, [
    profile?.id, 
    activeTab, 
    filters.rarity, 
    filters.sortBy, 
    filters.cardType, 
    filters.setId, 
    filters.search, 
    filters.foilFilter,
    filters.lowSerialOnly,
    filters.keyword
  ]);

  useEffect(() => {
    if (profile && (activeTab === 'collection' || activeTab === 'wishlist')) {
      fetchCollection();
      fetchStats();
      fetchWishlistCardIds();
    }

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [
    profile?.id, 
    activeTab, 
    filters.sortBy, 
    filters.rarity, 
    filters.cardType, 
    filters.search, 
    filters.foilFilter, 
    filters.keyword,
    filters.lowSerialOnly,
    fetchCollection, 
    fetchStats, 
    fetchWishlistCardIds
  ]);

  return {
    cards,
    loading,
    loadingMore,
    hasMore,
    stats,
    wishlistCardIds,
    setWishlistCardIds,
    fetchCollection,
    fetchStats,
    setCards
  };
}
