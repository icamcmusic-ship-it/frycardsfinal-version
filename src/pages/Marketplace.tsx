import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useProfileStore } from '../stores/profileStore';
import { Loader2, Store, Clock, Coins, Gem, Search, Plus, Filter, Star, Sparkles, Bookmark, X, History, Trophy, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'motion/react';
import { cn, getRarityStyles } from '../lib/utils';
import { CreateListingModal } from '../components/CreateListingModal';
import { CardSkeleton } from '../components/CardSkeleton';
import { CardDisplay } from '../components/CardDisplay';
import { ConfirmModal } from '../components/ConfirmModal';
import { Link } from 'react-router-dom';
import { ArrowRightLeft } from 'lucide-react';

interface BidHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  listing: any;
  bids: any[];
  loading: boolean;
}

function BidHistoryModal({ isOpen, onClose, listing, bids, loading }: BidHistoryModalProps) {
  if (!isOpen || !listing) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-[var(--surface)] border-4 border-[var(--border)] rounded-2xl p-6 w-full max-w-md shadow-[8px_8px_0px_0px_var(--border)]"
      >
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500 rounded-lg border-2 border-[var(--border)]">
              <History className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-xl font-black uppercase text-[var(--text)]">Bid History</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full text-[var(--text)]"><X /></button>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-4 p-3 bg-[var(--bg)] border-2 border-[var(--border)] rounded-xl">
            <img src={listing.card_image_url} alt={listing.card_name} className="w-12 h-12 object-cover rounded-lg border-2 border-[var(--border)]" />
            <div>
              <p className="font-black text-[var(--text)]">{listing.card_name}</p>
              <p className="text-xs font-bold text-slate-500 uppercase">
                {listing.listing_type === 'auction' ? 'Current Bid' : 'Price'}: {listing.price} {listing.currency === 'gold' ? 'Gold' : 'Gems'}
              </p>
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-slate-900/50 border-2 border-[var(--border)] rounded-xl overflow-hidden">
            <div className="max-h-60 overflow-y-auto custom-scrollbar">
              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                </div>
              ) : bids.length > 0 ? (
                <div className="divide-y-2 divide-slate-100 dark:divide-slate-800">
                  {bids.map((bid, i) => (
                    <div key={i} className={cn(
                      "flex justify-between items-center p-3 transition-colors",
                      bid.is_winning ? "bg-emerald-50 dark:bg-emerald-900/20" : "hover:bg-slate-100 dark:hover:bg-slate-800/50"
                    )}>
                      <div className="flex items-center gap-2">
                        {bid.is_winning && <Star className="w-4 h-4 text-emerald-500 fill-current" />}
                        <span className={cn("font-bold text-sm", bid.is_winning ? "text-emerald-600" : "text-[var(--text)]")}>
                          {bid.bidder_username}
                        </span>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-1 justify-end">
                          <span className="font-black text-sm text-[var(--text)]">{bid.bid_gold || bid.bid_gems}</span>
                          {listing.currency === 'gold' ? <Coins className="w-3 h-3 text-yellow-500" /> : <Gem className="w-3 h-3 text-emerald-500" />}
                        </div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">
                          {new Date(bid.bid_time).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-slate-400 font-bold uppercase text-xs">No bids yet</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full mt-6 py-3 bg-[var(--surface)] hover:bg-gray-100 dark:hover:bg-gray-800 text-[var(--text)] font-black rounded-xl border-4 border-[var(--border)] shadow-[4px_4px_0px_0px_var(--border)] transition-transform active:translate-y-1 active:shadow-none uppercase"
        >
          Close
        </button>
      </motion.div>
    </div>
  );
}

export function Marketplace() {
  const { profile } = useProfileStore();
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [hasNewListings, setHasNewListings] = useState(false);

  const [activeTab, setActiveTab] = useState<'all' | 'watchlist' | 'my_listings'>(() => {
    const params = new URLSearchParams(window.location.search);
    return (params.get('tab') as any) || 'all';
  });
  const [offset, setOffset] = useState(0);
  const [watchlist, setWatchlist] = useState<any[]>([]);
  const [watchlistedIds, setWatchlistedIds] = useState<Set<string>>(new Set());
  const watchlistedIdsRef = React.useRef<Set<string>>(new Set());
  const [wishlistCardIds, setWishlistCardIds] = useState<Set<string>>(new Set());
  const listingsLengthRef = useRef(0);

  useEffect(() => {
    listingsLengthRef.current = listings.length;
  }, [listings.length]);

  useEffect(() => {
    watchlistedIdsRef.current = watchlistedIds;
  }, [watchlistedIds]);

  const [myListings, setMyListings] = useState<any[]>([]);
  const [search, setSearch] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('q') || '';
  });
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  const [filter, setFilter] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('type') || 'all';
  });
  const [rarityFilter, setRarityFilter] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('rarity') || 'all';
  });
  const [sortBy, setSortBy] = useState<'newest' | 'price_asc' | 'price_desc' | 'ending_soon'>(() => {
    const params = new URLSearchParams(window.location.search);
    return (params.get('sort') as any) || 'newest';
  });

  // Sync state to URL
  useEffect(() => {
    const params = new URLSearchParams();
    if (activeTab !== 'all') params.set('tab', activeTab);
    if (debouncedSearch) params.set('q', debouncedSearch);
    if (filter !== 'all') params.set('type', filter);
    if (rarityFilter !== 'all') params.set('rarity', rarityFilter);
    if (sortBy !== 'newest') params.set('sort', sortBy);
    
    const newRelativePathQuery = window.location.pathname + (params.toString() ? '?' + params.toString() : '');
    window.history.replaceState(null, '', newRelativePathQuery);
  }, [activeTab, debouncedSearch, filter, rarityFilter, sortBy]);
  const [hoveredListing, setHoveredListing] = useState<string | null>(null);
  const [showBidHistoryModal, setShowBidHistoryModal] = useState(false);
  const [selectedListingForBids, setSelectedListingForBids] = useState<any>(null);
  const [bidHistories, setBidHistories] = useState<Record<string, any[]>>({});
  const [loadingBids, setLoadingBids] = useState<Set<string>>(new Set());

  const toggleBidHistory = async (listingId: string) => {
    const listing = [...listings, ...watchlist, ...myListings].find(l => l.id === listingId);
    setSelectedListingForBids(listing);
    setShowBidHistoryModal(true);

    if (bidHistories[listingId]) return;

    setLoadingBids(prev => new Set(prev).add(listingId));
    try {
      const { data, error } = await supabase.rpc('get_bid_history', { p_listing_id: listingId });
      if (error) throw error;
      setBidHistories(prev => ({ ...prev, [listingId]: data || [] }));
    } catch (err) {
      console.error('Error fetching bid history:', err);
    } finally {
      setLoadingBids(prev => {
        const next = new Set(prev);
        next.delete(listingId);
        return next;
      });
    }
  };

  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    variant: 'danger' | 'warning' | 'info';
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    variant: 'danger'
  });

  const [bidAmount, setBidAmount] = useState<number>(0);
  const [isBidModalOpen, setIsBidModalOpen] = useState(false);
  const [selectedListingForBid, setSelectedListingForBid] = useState<any>(null);

  const calculateTotalBid = (listing: any, amount: number) => {
    if (!listing) return 0;
    const taxRate = 0.10; // 10% marketplace fee
    const tax = Math.ceil(amount * taxRate);
    return amount + tax;
  };

  useEffect(() => {
    const expireAuctions = async () => {
      try {
        await supabase.rpc('expire_old_auctions');
      } catch (err) {
        console.error('Error expiring auctions:', err);
      }
    };
    expireAuctions();

    // Real-time subscription for marketplace updates
    const channel = supabase
      .channel('marketplace-updates')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'market_listings',
        filter: 'status=eq.active'
      }, () => {
        if (activeTab === 'all') {
          fetchListings();
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'market_listings',
        filter: 'status=eq.active'
      }, (payload) => {
        const updated = payload.new;
        const old = payload.old;
        
        // Find the card name from the current state
        const listing = [...listings, ...watchlist, ...myListings].find(l => l.id === updated.id);
        const cardName = listing?.card_name || 'card';
        
        // Trigger fetch for bids/status changes if on relevant tabs
        if (activeTab === 'all') fetchListings();
        else if (activeTab === 'watchlist') fetchWatchlist();

        // Check if this listing is in our watchlist for notifications
        if (watchlistedIdsRef.current.has(updated.id)) {
          const updatedBid = (updated.current_bid_gold ?? 0) + (updated.current_bid_gems ?? 0);
          const oldBid = (old.current_bid_gold ?? 0) + (old.current_bid_gems ?? 0);
          
          // If bid increased
          if (updatedBid > oldBid) {
            if (updated.highest_bidder_id === profile?.id) {
              toast.success(`You're the high bidder on ${cardName}!`, { id: `bid-win-${updated.id}` });
            } else {
              toast.error(`You've been outbid on ${cardName}!`, { id: `outbid-${updated.id}` });
            }
          }
          
          // If ended
          if (updated.status !== 'active' && old.status === 'active') {
            if (updated.status === 'sold') {
              const won = updated.highest_bidder_id === profile?.id;
              toast(won ? `🎉 You won the auction for ${cardName}!` : `Auction ended for ${cardName}`, {
                icon: won ? '🏆' : '⏰',
                id: `ended-${updated.id}`
              });
            } else {
              toast(`Auction expired for ${cardName}`, { icon: '⏰', id: `expired-${updated.id}` });
            }
          }
        }
      })
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [activeTab, profile?.id]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (activeTab === 'all') {
      fetchListings();
      fetchWatchlistedIds();
      fetchWishlistCardIds();
    } else if (activeTab === 'watchlist') {
      fetchWatchlist();
    } else if (activeTab === 'my_listings') {
      fetchMyListings();
    }
  }, [activeTab, rarityFilter, filter, sortBy, debouncedSearch]);

  const fetchWishlistCardIds = async () => {
    try {
      const { data, error } = await supabase.rpc('get_wishlist_card_ids');
      if (error) throw error;
      setWishlistCardIds(new Set(data || []));
    } catch (err) {
      console.error('Error fetching wishlist card ids:', err);
    }
  };

  const fetchWatchlistedIds = async () => {
    try {
      const { data, error } = await supabase.rpc('get_watchlist');
      if (error) throw error;
      setWatchlistedIds(new Set((data || []).map((item: any) => item.id)));
    } catch (err) {
      console.error('Error fetching watchlisted ids:', err);
    }
  };

  const fetchMyListings = async (isLoadMore = false) => {
    try {
      if (!isLoadMore) {
        setLoading(true);
        setOffset(0);
        setHasMore(true);
      } else {
        setLoadingMore(true);
      }

      const nextOffset = isLoadMore ? myListings.length : 0;

      const { data, error } = await supabase.rpc('get_my_listings', {
        p_limit: 20,
        p_offset: nextOffset
      });
      if (error) throw error;
      
      // Normalize flat data into nested card object
      const fetched = (data || []).map((item: any) => ({
        ...item,
        card: {
          ...(item.card || {}),
          is_foil: item.is_foil,
        }
      }));

      if (isLoadMore) {
        setMyListings(prev => [...prev, ...fetched]);
      } else {
        setMyListings(fetched);
      }

      setHasMore(fetched.length === 20);
      setOffset(nextOffset + fetched.length);
    } catch (err) {
      console.error('Error fetching my listings:', err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const [totalCount, setTotalCount] = useState(0);
  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const activeRequestIdRef = useRef<number>(0);

  const fetchListings = async (isLoadMore = false) => {
    if (fetchTimeoutRef.current) clearTimeout(fetchTimeoutRef.current);
    
    if (!isLoadMore) {
      fetchTimeoutRef.current = setTimeout(() => {
        performFetch(false);
      }, 100);
      return;
    }
    
    fetchTimeoutRef.current = setTimeout(() => {
      performFetch(true);
    }, 100);
  };

  const performFetch = async (isLoadMore: boolean) => {
    const requestId = ++activeRequestIdRef.current;
    
    try {
      const nextOffset = isLoadMore ? listingsLengthRef.current : 0;
      if (!isLoadMore) {
        setListings([]);
        setHasMore(true);
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      const { data, error } = await supabase.rpc('get_market_listings', {
        p_limit: 20,
        p_offset: nextOffset,
        p_rarity: rarityFilter === 'all' ? null : rarityFilter,
        p_listing_type: filter === 'all' ? null : filter,
        p_search: debouncedSearch || null,
        p_sort_by: sortBy
      });
      if (error) throw error;
      if (activeRequestIdRef.current !== requestId) return; // ignore stale response

      const fetchedListings = (data?.listings || []).map((item: any) => ({
        ...item,
        card: {
          ...(item.card || {}),
          is_foil: item.is_foil,
        }
      }));

      const newTotalCount = data?.total_count || 0;
      setTotalCount(newTotalCount);

      if (isLoadMore) {
        setListings(prev => {
          // Avoid duplicates
          const existingIds = new Set(prev.map(l => l.id));
          const newUniqueListings = fetchedListings.filter((l: any) => !existingIds.has(l.id));
          const updatedListings = [...prev, ...newUniqueListings];
          setHasMore(updatedListings.length < newTotalCount);
          return updatedListings;
        });
      } else {
        setListings(fetchedListings);
        setHasMore(fetchedListings.length < newTotalCount);
      }
    } catch (err) {
      if (activeRequestIdRef.current === requestId) {
        console.error('Error fetching listings:', err);
      }
    } finally {
      if (activeRequestIdRef.current === requestId) {
        setLoading(false);
        setLoadingMore(false);
      }
    }
  };

  // Infinite scroll listener
  useEffect(() => {
    const handleScroll = () => {
      if (window.innerHeight + document.documentElement.scrollTop >= document.documentElement.offsetHeight - 500) {
        if (hasMore && !loadingMore) {
          if (activeTab === 'all') fetchListings(true);
          else if (activeTab === 'watchlist') fetchWatchlist(true);
          else if (activeTab === 'my_listings') fetchMyListings(true);
        }
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [hasMore, loadingMore, listings.length, watchlist.length, myListings.length, activeTab]);

  const fetchWatchlist = async (isLoadMore = false) => {
    try {
      if (!isLoadMore) {
        setLoading(true);
        setOffset(0);
        setHasMore(true);
      } else {
        setLoadingMore(true);
      }

      const nextOffset = isLoadMore ? watchlist.length : 0;

      const { data, error } = await supabase.rpc('get_watchlist', {
        p_limit: 20,
        p_offset: nextOffset
      });
      if (error) throw error;
      
      // Normalize flat data into nested card object
      const fetched = (data || []).map((item: any) => ({
        ...item,
        card: {
          ...(item.card || {}),
          is_foil: item.is_foil,
        }
      }));

      if (isLoadMore) {
        setWatchlist(prev => [...prev, ...fetched]);
      } else {
        setWatchlist(fetched);
      }

      setHasMore(fetched.length === 20);
      setOffset(nextOffset + fetched.length);
    } catch (err) {
      console.error('Error fetching watchlist:', err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleToggleWatchlist = async (listingId: string) => {
    try {
      const { error } = await supabase.rpc('toggle_watchlist', {
        p_listing_id: listingId
      });
      if (error) throw error;
      
      if (activeTab === 'watchlist') {
        fetchWatchlist();
      } else {
        setWatchlistedIds(prev => {
          const newSet = new Set(prev);
          if (newSet.has(listingId)) {
            newSet.delete(listingId);
            toast.success('Removed from watchlist', { id: `watchlist-${listingId}` });
          } else {
            newSet.add(listingId);
            toast.success('Added to watchlist', { id: `watchlist-${listingId}`, icon: '✨' });
          }
          return newSet;
        });
      }
    } catch (err) {
      console.error('Error toggling watchlist:', err);
      toast.error('Failed to update watchlist');
    }
  };

  const handleBlockUser = async (userId: string, username: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Block User?',
      message: `Are you sure you want to block ${username}? You won't see their listings anymore.`,
      variant: 'danger',
      onConfirm: async () => {
        try {
          const { error } = await supabase.rpc('block_user', {
            p_blocked_user_id: userId
          });
          if (error) throw error;
          
          toast.success(`Blocked ${username}`, { id: `block-${userId}`, icon: '🚫' });
          fetchListings(); // Refresh to hide their listings
        } catch (err) {
          console.error('Error blocking user:', err);
          toast.error('Failed to block user');
        }
      }
    });
  };

  const handleCancelListing = async (listingId: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Cancel Listing?',
      message: 'Are you sure you want to cancel this listing?',
      variant: 'warning',
      onConfirm: async () => {
        try {
          const { error } = await supabase.rpc('cancel_listing', {
            p_listing_id: listingId
          });
          if (error) throw error;
          toast.success('Listing cancelled!', { id: `cancel-${listingId}`, icon: '🗑️' });
          fetchMyListings();
        } catch (err: any) {
          toast.error(err.message || 'Failed to cancel listing');
        }
      }
    });
  };

  const handleBuy = async (listing: any) => {
    if (buying || !profile) return;
    
    const canAfford = listing.currency === 'gems'
      ? profile.gem_balance >= listing.price
      : profile.gold_balance >= listing.price;

    if (!canAfford) {
      toast.error(`Not enough ${listing.currency}!`);
      return;
    }

    setConfirmModal({
      isOpen: true,
      title: 'Confirm Purchase',
      message: `Buy ${listing.card_name} for ${listing.price} ${listing.currency}?`,
      variant: 'info',
      onConfirm: async () => {
        setBuying(listing.id);
        try {
          const { error } = await supabase.rpc('buy_market_listing', {
            p_listing_id: listing.id
          });

          if (error) throw error;
          
          toast.success(`Successfully bought ${listing.card_name}!`, { id: `buy-${listing.id}`, icon: '✨' });
          supabase.rpc('increment_mission_progress', { p_mission_type: 'buy_card', p_amount: 1 });
          fetchListings();
          
          // Refresh profile to update gold balance
          await useProfileStore.getState().refreshProfile();
        } catch (err: any) {
          toast.error(err.message || 'Failed to buy card');
        } finally {
          setBuying(null);
        }
      }
    });
  };

  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 10000); // Throttled to 10s as requested
    return () => clearInterval(timer);
  }, []);

  function timeLeft(expiresAt: string): string {
    const diff = new Date(expiresAt).getTime() - now;
    if (diff <= 1000) return 'Expired';
    
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);

    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  }

  const filteredListings = (activeTab === 'all' ? listings : activeTab === 'watchlist' ? watchlist : myListings)
    .filter(listing => {
      if (activeTab === 'my_listings' && listing.status !== 'active') return false;
      if (filter !== 'all' && listing.listing_type !== filter) return false;
      // Client-side search for watchlist/my_listings since they don't use the search RPC param.
      // This is intentional: "All" tab uses server-side search via p_search, 
      // while other tabs use client-side filtering on the fetched results.
      if (activeTab !== 'all' && search && !listing.card_name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 8 }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-[var(--text)] tracking-tight uppercase">Marketplace</h1>
          <p className="text-slate-600 font-bold mt-1">Buy and sell cards with other players</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex bg-[var(--surface)] border-4 border-[var(--border)] rounded-xl p-1 shadow-[4px_4px_0px_0px_var(--border)] w-fit">
            <button
              onClick={() => setActiveTab('all')}
              className={cn(
                "px-6 py-2 rounded-lg font-black text-sm uppercase transition-colors",
                activeTab === 'all' ? "bg-[var(--text)] text-[var(--surface)]" : "text-slate-600 hover:bg-slate-100"
              )}
            >
              All Listings
            </button>
            <button
              onClick={() => setActiveTab('watchlist')}
              className={cn(
                "px-6 py-2 rounded-lg font-black text-sm uppercase transition-colors",
                activeTab === 'watchlist' ? "bg-[var(--text)] text-[var(--surface)]" : "text-slate-600 hover:bg-slate-100"
              )}
            >
              Watchlist
            </button>
            <button
              onClick={() => setActiveTab('my_listings')}
              className={cn(
                "px-6 py-2 rounded-lg font-black text-sm uppercase transition-colors",
                activeTab === 'my_listings' ? "bg-[var(--text)] text-[var(--surface)]" : "text-slate-600 hover:bg-slate-100"
              )}
            >
              My Listings
            </button>
          </div>

          <button 
            onClick={() => setIsModalOpen(true)}
            className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-black rounded-xl border-4 border-[var(--border)] transition-transform active:translate-y-1 shadow-[4px_4px_0px_0px_var(--border)] flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Create Listing
          </button>
        </div>
      </div>
      
      <CreateListingModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSuccess={fetchListings} />

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        variant={confirmModal.variant}
      />

      {hasNewListings && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-blue-500 text-white px-6 py-3 rounded-xl border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center justify-between gap-4 sticky top-[120px] z-40"
        >
          <div className="flex items-center gap-2 font-black uppercase italic">
            <Sparkles className="w-5 h-5 animate-pulse" />
            New listings are available!
          </div>
          <button 
            onClick={() => {
              setHasNewListings(false);
              fetchListings();
            }}
            className="px-4 py-1 bg-white text-black font-black rounded-lg border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-y-0.5 active:translate-y-1 active:shadow-none transition-all text-sm uppercase"
          >
            Refresh
          </button>
        </motion.div>
      )}

      <div className="sticky top-16 z-30 bg-[var(--bg)]/90 backdrop-blur-sm py-4 border-b-2 border-[var(--border)] -mx-4 px-4 md:-mx-8 md:px-8">
        <div className="max-w-7xl mx-auto flex gap-2 overflow-x-auto pb-1 scrollbar-hide flex-nowrap items-center">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="shrink-0 px-4 py-2 bg-[var(--surface)] border-4 border-[var(--border)] rounded-xl text-[var(--text)] font-bold focus:outline-none shadow-[4px_4px_0px_0px_var(--border)]"
          >
            <option value="newest">Newest First</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
            <option value="ending_soon">Ending Soon</option>
          </select>
          
          <div className="relative shrink-0 w-48">
            <input 
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search marketplace..."
              className="w-full px-4 py-2 bg-[var(--surface)] border-4 border-[var(--border)] rounded-xl text-[var(--text)] font-bold placeholder-slate-400 focus:outline-none shadow-[4px_4px_0px_0px_var(--border)]"
            />
            {search !== debouncedSearch && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
              </div>
            )}
          </div>
          <select 
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="shrink-0 px-4 py-2 bg-[var(--surface)] border-4 border-[var(--border)] rounded-xl text-[var(--text)] font-bold appearance-none focus:outline-none shadow-[4px_4px_0px_0px_var(--border)]"
          >
            <option value="all">All Types</option>
            <option value="fixed_price">Buy Now</option>
            <option value="auction">Auctions</option>
          </select>
          <select 
            value={rarityFilter}
            onChange={(e) => setRarityFilter(e.target.value)}
            className="shrink-0 px-4 py-2 bg-[var(--surface)] border-4 border-[var(--border)] rounded-xl text-[var(--text)] font-bold appearance-none focus:outline-none shadow-[4px_4px_0px_0px_var(--border)]"
          >
            <option value="all">All Rarities</option>
            <option value="Common">Common</option>
            <option value="Uncommon">Uncommon</option>
            <option value="Rare">Rare</option>
            <option value="Super-Rare">Super-Rare</option>
            <option value="Mythic">Mythic</option>
            <option value="Divine">Divine</option>
          </select>

          {(search || filter !== 'all' || rarityFilter !== 'all' || sortBy !== 'newest') && (
            <button
              onClick={() => {
                setSearch('');
                setFilter('all');
                setRarityFilter('all');
                setSortBy('newest');
              }}
              className="shrink-0 px-4 py-2 bg-red-100 hover:bg-red-200 text-red-600 font-black rounded-xl border-4 border-red-200 shadow-[4px_4px_0px_0px_#fecaca] flex items-center gap-2 transition-all active:translate-y-1 active:shadow-none uppercase text-xs"
            >
              <X className="w-4 h-4" />
              Clear
            </button>
          )}
        </div>
      </div>

      {activeTab === 'all' && listings.length > 0 && (
        <div className="mb-4 flex justify-between items-center px-2">
          <p className="text-sm font-bold text-slate-500">
            Showing <span className="text-[var(--text)]">{listings.length}</span> of <span className="text-[var(--text)]">{totalCount}</span> listings
          </p>
        </div>
      )}

      {filteredListings.length === 0 && !loadingMore ? (
        <div className="text-center py-20 bg-[var(--surface)] border-4 border-[var(--border)] rounded-2xl shadow-[8px_8px_0px_0px_var(--border)]">
          <div className="w-20 h-20 mx-auto bg-[var(--bg)] rounded-full flex items-center justify-center mb-4 border-4 border-[var(--border)]">
            <Store className="w-10 h-10 text-slate-400" />
          </div>
          <h3 className="text-2xl font-black text-[var(--text)] mb-2 uppercase">
            {activeTab === 'all' ? 'Market is empty' : activeTab === 'watchlist' ? 'Watchlist is empty' : 'No listings found'}
          </h3>
          <p className="text-slate-600 font-bold">
            {activeTab === 'all' ? 'Check back later for new listings' : activeTab === 'watchlist' ? 'Add items to your watchlist to track them' : 'Create a listing to sell your cards'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredListings.map((listing) => (
            <motion.div 
              key={listing.id}
              whileHover={{ y: -4, rotate: -1 }}
              onMouseEnter={() => setHoveredListing(listing.id)}
              onMouseLeave={() => setHoveredListing(null)}
              className={cn(
                "bg-[var(--surface)] border-4 rounded-2xl p-4 flex flex-col gap-4 shadow-[6px_6px_0px_0px_var(--border)] transition-all duration-300 group relative overflow-hidden",
                listing.card_rarity === 'Divine' ? 'border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.5)]' :
                listing.card_rarity === 'Mythic' ? 'border-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.5)]' :
                listing.card_rarity === 'Super-Rare' ? 'border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.5)]' :
                listing.card_rarity === 'Rare' ? 'border-blue-500' :
                listing.card_rarity === 'Uncommon' ? 'border-green-500' :
                'border-slate-400'
              )}
            >
              <div className="flex justify-between items-start">
                <div className="flex gap-3">
                  <div className="w-12 h-16 shrink-0 rounded-lg overflow-hidden border-2 border-[var(--border)] bg-slate-100 shadow-[2px_2px_0px_0px_var(--border)]">
                    <img src={listing.card_image_url} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  </div>
                  <div>
                    <div className={cn(
                      "text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border-2 shadow-[2px_2px_0px_0px_var(--border)] inline-block mb-1",
                      getRarityStyles(listing.card_rarity, listing.card.is_foil)
                    )}>
                      {listing.card_rarity}
                    </div>
                    {profile?.id === listing.seller_id && (
                      <div className="text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-blue-500 text-white border-2 border-black shadow-[1px_1px_0px_0px_black] inline-block mb-1 ml-1">
                        YOUR LISTING
                      </div>
                    )}
                    <h3 className="font-black text-[var(--text)] text-base leading-tight uppercase flex items-center gap-1.5">
                      {listing.card_name}
                      {wishlistCardIds.has(listing.card_id) && (
                        <Bookmark className="w-3.5 h-3.5 fill-blue-400 text-blue-600" title="On your wishlist!" />
                      )}
                    </h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <div className="w-4 h-4 rounded-full overflow-hidden border border-black/20 bg-slate-100">
                        <img 
                          src={listing.seller_avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${listing.seller_id}`} 
                          alt={listing.seller_name}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <p className="text-[10px] text-slate-500 font-bold">Seller: {listing.seller_name}</p>
                      {profile?.id !== listing.seller_id && (
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => handleBlockUser(listing.seller_id, listing.seller_name)}
                            className="text-[10px] text-red-500 hover:text-red-700 font-bold underline"
                            title="Block Seller"
                          >
                            Block
                          </button>
                          <span className="text-slate-300">•</span>
                          <button 
                            onClick={() => {
                              setConfirmModal({
                                isOpen: true,
                                title: 'Report Listing',
                                message: `Are you sure you want to report this listing for ${listing.card_name}?`,
                                variant: 'warning',
                                onConfirm: async () => {
                                  try {
                                    const { error } = await supabase.from('reports').insert({
                                      reporter_id: profile?.id,
                                      target_id: listing.id,
                                      target_listing_id: listing.id,
                                      target_type: 'market_listing',
                                      reason: 'Reported from marketplace UI'
                                    });
                                    if (error) throw error;
                                    toast.success('Listing reported. Thank you!');
                                  } catch (err: any) {
                                    toast.error(err.message || 'Failed to report listing');
                                  }
                                }
                              });
                            }}
                            className="text-[10px] text-slate-400 hover:text-red-500 font-bold underline"
                            title="Report Listing"
                          >
                            Report
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <button 
                    onClick={() => handleToggleWatchlist(listing.id)}
                    className="p-1 hover:bg-gray-100 rounded-full transition-colors border-2 border-transparent hover:border-[var(--border)]"
                    title={(activeTab === 'watchlist' || watchlistedIds.has(listing.id)) ? "Remove from Watchlist" : "Add to Watchlist"}
                  >
                    <Star className={cn("w-5 h-5", (activeTab === 'watchlist' || watchlistedIds.has(listing.id)) ? "fill-yellow-400 text-yellow-500" : "text-slate-400")} />
                  </button>
                  {listing.is_foil && (
                    <div className="bg-yellow-100 border-2 border-yellow-400 text-yellow-700 text-xs font-black px-2 py-1 rounded-lg">
                      FOIL
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex-1 flex items-center justify-center py-2 relative">
                <div className="w-full max-w-[240px] container-type-inline-size">
                  <CardDisplay card={{ ...listing.card, name: listing.card_name, rarity: listing.card_rarity, image_url: listing.card_image_url, is_foil: listing.is_foil }} showQuantity={false} showNewBadge={false} />
                </div>
              </div>

              <div className="bg-[var(--bg)] border-2 border-[var(--border)] rounded-xl p-3 flex justify-between items-center">
                <div>
                  <p className="text-xs text-slate-500 font-bold uppercase">{listing.type === 'fixed_price' ? 'Buy Now' : 'Current Bid'}</p>
                  <div className="flex items-center gap-1 text-[var(--text)] font-black text-lg">
                    {listing.currency === 'gems' ? (
                      <Gem className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <Coins className="w-4 h-4 text-yellow-500" />
                    )}
                    {listing.type === 'auction' 
                      ? (listing.current_bid_gold ?? listing.current_bid_gems ?? listing.price) 
                      : listing.price}
                  </div>
                  {listing.type === 'auction' && !listing.highest_bidder_name && (
                    <p className="text-[10px] text-blue-500 font-black uppercase">Starting Bid</p>
                  )}
                  {listing.type === 'auction' && listing.highest_bidder_name && (
                    <p className="text-[10px] text-slate-500 font-bold truncate max-w-[100px]">by {listing.highest_bidder_name}</p>
                  )}
                </div>
                {listing.type === 'auction' && (
                  <div className="text-right">
                    <p className="text-xs text-slate-500 font-bold uppercase">Ends In</p>
                    <div className="flex items-center gap-1 text-red-500 font-black">
                      <Clock className="w-4 h-4" />
                      <span>{listing.expires_at ? timeLeft(listing.expires_at) : '—'}</span>
                    </div>
                    <button 
                      onClick={() => toggleBidHistory(listing.id)}
                      className="text-[10px] font-black text-blue-500 hover:text-blue-600 underline uppercase mt-1"
                    >
                      View Bids
                    </button>
                  </div>
                )}
              </div>

              {activeTab === 'my_listings' ? (
                listing.status === 'active' ? (
                  <button 
                    onClick={() => handleCancelListing(listing.id)}
                    className="w-full py-3 bg-red-500 hover:bg-red-600 text-white font-black rounded-xl border-4 border-[var(--border)] transition-transform active:translate-y-1 shadow-[4px_4px_0px_0px_var(--border)] flex items-center justify-center gap-2"
                  >
                    Cancel Listing
                  </button>
                ) : (
                  <div className="w-full py-3 bg-slate-200 text-slate-500 font-black rounded-xl border-4 border-[var(--border)] flex items-center justify-center uppercase">
                    {listing.status}
                  </div>
                )
              ) : listing.seller_id === profile?.id ? (
                <div className="w-full py-3 bg-slate-200 text-slate-500 font-black rounded-xl border-4 border-[var(--border)] flex items-center justify-center uppercase">
                  Your Listing
                </div>
              ) : (
                <div className="flex gap-2">
                  <button 
                    onClick={() => {
                      if (listing.listing_type === 'fixed_price') {
                        handleBuy(listing);
                      } else {
                        setSelectedListingForBid(listing);
                        setBidAmount(Math.ceil((listing.current_bid_gold ?? listing.current_bid_gems ?? listing.price) * 1.05));
                        setIsBidModalOpen(true);
                      }
                    }}
                    disabled={buying === listing.id}
                    className="flex-1 py-3 bg-yellow-400 hover:bg-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed text-black font-black rounded-xl border-4 border-[var(--border)] transition-transform active:translate-y-1 shadow-[4px_4px_0px_0px_var(--border)] flex items-center justify-center gap-2"
                  >
                    {buying === listing.id ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        {listing.listing_type === 'fixed_price' ? <Coins className="w-5 h-5" /> : <Trophy className="w-5 h-5" />}
                        {listing.listing_type === 'fixed_price' ? 'Buy Now' : 'Place Bid'}
                      </>
                    )}
                  </button>
                  {listing.listing_type === 'fixed_price' && (
                    <Link
                      to={`/trades?friend_id=${listing.seller_id}&card_id=${listing.card_id}`}
                      className="flex-1 py-3 bg-blue-500 hover:bg-blue-600 text-white font-black rounded-xl border-4 border-[var(--border)] transition-transform active:translate-y-1 shadow-[4px_4px_0px_0px_var(--border)] flex items-center justify-center gap-2"
                    >
                      <ArrowRightLeft className="w-5 h-5" />
                      Make Offer
                    </Link>
                  )}
                  {listing.listing_type === 'auction' && (
                    <>
                      <button 
                        onClick={() => handleToggleWatchlist(listing.id)}
                        className="flex-1 py-3 bg-[var(--surface)] hover:bg-slate-100 text-slate-600 font-black rounded-xl border-4 border-[var(--border)] transition-transform active:translate-y-1 shadow-[4px_4px_0px_0px_var(--border)] flex items-center justify-center gap-2"
                      >
                        <Bookmark className={cn("w-5 h-5", watchlistedIds.has(listing.id) && "fill-current text-yellow-500")} />
                        Watch
                      </button>
                      <button 
                        onClick={() => {
                          setSelectedListingForBids(listing);
                          toggleBidHistory(listing.id);
                          setShowBidHistoryModal(true);
                        }}
                        className="p-3 bg-[var(--surface)] hover:bg-slate-100 rounded-xl border-4 border-[var(--border)] shadow-[4px_4px_0px_0px_var(--border)]"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </>
                  )}
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}

      {loadingMore && (
        <div className="flex justify-center py-8">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      )}

      {totalCount > 0 && (
        <div className="mt-8 flex flex-col items-center gap-2">
          <p className="text-xs font-black text-slate-400 uppercase tracking-widest">
            Showing {activeTab === 'all' ? listings.length : activeTab === 'watchlist' ? watchlist.length : myListings.length} of {totalCount} listings
          </p>
          {!hasMore && (
            <p className="text-[10px] font-bold text-slate-300 uppercase">All listings loaded</p>
          )}
        </div>
      )}

      <BidHistoryModal
        isOpen={showBidHistoryModal}
        onClose={() => setShowBidHistoryModal(false)}
        listing={selectedListingForBids}
        bids={selectedListingForBids ? bidHistories[selectedListingForBids.id] || [] : []}
        loading={selectedListingForBids ? loadingBids.has(selectedListingForBids.id) : false}
      />

      <AnimatePresence>
        {isBidModalOpen && selectedListingForBid && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[var(--surface)] border-4 border-[var(--border)] rounded-3xl p-8 max-w-sm w-full shadow-[12px_12px_0px_0px_var(--border)]"
            >
              <h2 className="text-2xl font-black uppercase text-[var(--text)] mb-2">Place Bid</h2>
              <p className="text-sm font-bold text-slate-500 mb-6">
                Bidding on <span className="text-[var(--text)]">{selectedListingForBid.card_name}</span>
              </p>

              <div className="space-y-4">
                <div className="p-4 bg-[var(--bg)] border-2 border-[var(--border)] rounded-2xl">
                  <div className="flex justify-between text-[10px] font-black uppercase text-slate-400 mb-1">
                    <span>Current High Bid</span>
                    <span>Min Next Bid</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-1 font-black text-xl text-[var(--text)]">
                      {selectedListingForBid.currency === 'gold' ? <Coins className="w-5 h-5 text-yellow-500" /> : <Gem className="w-5 h-5 text-emerald-500" />}
                      {selectedListingForBid.current_bid_gold ?? selectedListingForBid.current_bid_gems ?? selectedListingForBid.price}
                    </div>
                    <div className="flex items-center gap-1 font-black text-sm text-blue-500">
                      {Math.ceil((selectedListingForBid.current_bid_gold ?? selectedListingForBid.current_bid_gems ?? selectedListingForBid.price) * 1.05)}
                    </div>
                  </div>
                </div>
 
                <div className="relative">
                  <input 
                    type="number" 
                    min={Math.ceil((selectedListingForBid.current_bid_gold ?? selectedListingForBid.current_bid_gems ?? selectedListingForBid.price) * 1.05)}
                    value={bidAmount}
                    onChange={e => setBidAmount(parseInt(e.target.value))}
                    className="w-full pl-4 pr-12 py-4 border-4 border-[var(--border)] rounded-2xl font-black text-2xl bg-[var(--bg)] text-[var(--text)] focus:outline-none focus:border-blue-500 shadow-[4px_4px_0px_0px_var(--border)]"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2">
                    {selectedListingForBid.currency === 'gold' ? <Coins className="w-6 h-6 text-yellow-500" /> : <Gem className="w-6 h-6 text-emerald-500" />}
                  </div>
                </div>

                <div className="p-3 border-2 border-dashed border-slate-200 rounded-xl space-y-1">
                  <div className="flex justify-between text-[10px] font-black uppercase text-slate-400">
                    <span>Market Tax (10%)</span>
                    <span className="text-red-400">+{Math.ceil(bidAmount * 0.10)}</span>
                  </div>
                  <div className="flex justify-between text-xs font-black uppercase text-slate-400 border-t border-slate-100 pt-1 mt-1">
                    <span>Bid Amount</span>
                    <span>{bidAmount.toLocaleString()} {selectedListingForBid.currency}</span>
                  </div>
                  <div className="flex justify-between text-sm font-black uppercase text-[var(--text)] border-t-2 border-[var(--border)] pt-2 mt-1">
                    <span>Total Deduction</span>
                    <span>{calculateTotalBid(selectedListingForBid, bidAmount).toLocaleString()} {selectedListingForBid.currency}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button 
                    onClick={() => setIsBidModalOpen(false)}
                    className="py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-black rounded-xl border-4 border-slate-200 transition-all uppercase text-sm"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={async () => {
                      if (!bidAmount) return;
                      const minBid = Math.ceil((selectedListingForBid.current_bid_gold ?? selectedListingForBid.current_bid_gems ?? selectedListingForBid.price) * 1.05);
                      if (bidAmount < minBid) {
                        toast.error(`Minimum bid is ${minBid}`);
                        return;
                      }

                      setBuying(selectedListingForBid.id);
                      try {
                        const { data, error } = await supabase.rpc('place_bid', {
                          p_listing_id: selectedListingForBid.id,
                          p_bid_gold: selectedListingForBid.currency === 'gold' ? bidAmount : 0,
                          p_bid_gems: selectedListingForBid.currency === 'gems' ? bidAmount : 0
                        });
                        if (error) throw error;
                        
                        toast.success(`Bid placed!`, { icon: '🔨' });
                        await useProfileStore.getState().refreshProfile();
                        setIsBidModalOpen(false);
                        fetchListings();
                      } catch (err: any) {
                        toast.error(err.message || 'Failed to place bid');
                      } finally {
                        setBuying(null);
                      }
                    }}
                    disabled={buying === selectedListingForBid.id}
                    className="py-3 bg-yellow-400 hover:bg-yellow-500 text-black font-black rounded-xl border-4 border-black shadow-[4px_4px_0px_0px_black] transition-all active:translate-y-1 active:shadow-none uppercase text-sm flex items-center justify-center gap-2"
                  >
                    {buying === selectedListingForBid.id ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm Bid'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
