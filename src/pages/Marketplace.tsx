import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useProfileStore } from '../stores/profileStore';
import { Loader2, Store, Clock, Coins, Gem, Search, Plus, Filter, Star, Sparkles, Bookmark } from 'lucide-react';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'motion/react';
import { cn, getRarityStyles } from '../lib/utils';
import { CreateListingModal } from '../components/CreateListingModal';
import { CardSkeleton } from '../components/CardSkeleton';
import { CardDisplay } from '../components/CardDisplay';
import { ConfirmModal } from '../components/ConfirmModal';

export function Marketplace() {
  const { profile } = useProfileStore();
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [hasNewListings, setHasNewListings] = useState(false);

  const [activeTab, setActiveTab] = useState<'all' | 'watchlist' | 'my_listings'>('all');
  const [watchlist, setWatchlist] = useState<any[]>([]);
  const [watchlistedIds, setWatchlistedIds] = useState<Set<string>>(new Set());
  const watchlistedIdsRef = React.useRef<Set<string>>(new Set());
  const [wishlistCardIds, setWishlistCardIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    watchlistedIdsRef.current = watchlistedIds;
  }, [watchlistedIds]);
  const [myListings, setMyListings] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [rarityFilter, setRarityFilter] = useState('all');
  const [elementFilter, setElementFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'price' | 'newest'>('newest');
  const [hoveredListing, setHoveredListing] = useState<string | null>(null);
  const [expandedBids, setExpandedBids] = useState<Set<string>>(new Set());
  const [bidHistories, setBidHistories] = useState<Record<string, any[]>>({});
  const [loadingBids, setLoadingBids] = useState<Set<string>>(new Set());

  const toggleBidHistory = async (listingId: string) => {
    if (expandedBids.has(listingId)) {
      setExpandedBids(prev => {
        const next = new Set(prev);
        next.delete(listingId);
        return next;
      });
      return;
    }

    setExpandedBids(prev => new Set(prev).add(listingId));
    
    if (!bidHistories[listingId]) {
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

  useEffect(() => {
    const expireAuctions = async () => {
      try {
        await supabase.rpc('expire_old_auctions');
      } catch (err) {
        console.error('Error expiring auctions:', err);
      }
    };
    expireAuctions();

    // Real-time subscription for new listings
    const channel = supabase
      .channel('marketplace-updates')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'market_listings',
        filter: 'status=eq.active'
      }, () => {
        if (activeTab === 'all') {
          setHasNewListings(true);
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'market_listings'
      }, (payload) => {
        const updated = payload.new;
        const old = payload.old;
        
        // Find the card name from the current state
        const listing = [...listings, ...watchlist, ...myListings].find(l => l.id === updated.id);
        const cardName = listing?.card_name || listing?.card?.name || 'card';
        
        // Check if this listing is in our watchlist
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
  }, [activeTab, rarityFilter, elementFilter, filter, sortBy, debouncedSearch]);

  const fetchWishlistCardIds = async () => {
    try {
      const { data, error } = await supabase.rpc('get_wishlist', {
        p_rarity: null
      });
      if (error) throw error;
      setWishlistCardIds(new Set((data || []).map((item: any) => item.card_id)));
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

  const fetchMyListings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('get_my_listings');
      if (error) throw error;
      
      // Normalize flat data into nested card object
      const normalized = (data || []).map((item: any) => ({
        ...item,
        card: item.card || {
          name: item.card_name,
          rarity: item.card_rarity,
          element: item.card_element,
          image_url: item.card_image_url,
          type: item.card_type,
          flavor_text: item.card_flavor_text
        }
      }));
      setMyListings(normalized);
    } catch (err) {
      console.error('Error fetching my listings:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchListings = async (isLoadMore = false) => {
    try {
      const nextOffset = isLoadMore ? listings.length : 0;
      if (!isLoadMore) {
        setListings([]);
        setHasMore(true);
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      const { data, error } = await supabase.rpc('get_active_listings', {
        p_limit: 20,
        p_offset: nextOffset,
        p_rarity: rarityFilter === 'all' ? null : rarityFilter,
        p_element: elementFilter === 'all' ? null : elementFilter,
        p_listing_type: filter === 'all' ? null : filter,
        p_search: debouncedSearch || null,
        p_sort_by: sortBy
      });
      if (error) throw error;
      
      // Normalize flat data into nested card object
      const fetchedListings = (data || []).map((item: any) => ({
        ...item,
        card: item.card || {
          name: item.card_name,
          rarity: item.card_rarity,
          element: item.card_element,
          image_url: item.card_image_url,
          type: item.card_type,
          flavor_text: item.card_flavor_text
        }
      }));
      if (isLoadMore) {
        setListings(prev => {
          // Avoid duplicates
          const existingIds = new Set(prev.map(l => l.id));
          const newUniqueListings = fetchedListings.filter((l: any) => !existingIds.has(l.id));
          return [...prev, ...newUniqueListings];
        });
      } else {
        setListings(fetchedListings);
      }

      if (fetchedListings.length < 20) {
        setHasMore(false);
      } else {
        setHasMore(true);
      }
    } catch (err) {
      console.error('Error fetching listings:', err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  // Infinite scroll listener
  useEffect(() => {
    const handleScroll = () => {
      if (window.innerHeight + document.documentElement.scrollTop >= document.documentElement.offsetHeight - 500) {
        if (hasMore && !loadingMore && activeTab === 'all') {
          fetchListings(true);
        }
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [hasMore, loadingMore, listings.length, activeTab]);

  const fetchWatchlist = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('get_watchlist');
      if (error) throw error;
      
      // Normalize flat data into nested card object
      const normalized = (data || []).map((item: any) => ({
        ...item,
        card: item.card || {
          name: item.card_name,
          rarity: item.card_rarity,
          element: item.card_element,
          image_url: item.card_image_url,
          type: item.card_type,
          flavor_text: item.card_flavor_text
        }
      }));
      setWatchlist(normalized);
    } catch (err) {
      console.error('Error fetching watchlist:', err);
    } finally {
      setLoading(false);
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
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  function timeLeft(expiresAt: string): string {
    const diff = new Date(expiresAt).getTime() - now;
    if (diff <= 0) return 'Expired';
    
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);

    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  }

  const filteredListings = (activeTab === 'all' ? listings : activeTab === 'watchlist' ? watchlist : myListings)
    .filter(listing => {
      if (filter !== 'all' && listing.type !== filter) return false;
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
            <option value="newest">Sort by Newest</option>
            <option value="price">Sort by Price</option>
          </select>
          
          <input 
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search marketplace..."
            className="shrink-0 w-48 px-4 py-2 bg-[var(--surface)] border-4 border-[var(--border)] rounded-xl text-[var(--text)] font-bold placeholder-slate-400 focus:outline-none shadow-[4px_4px_0px_0px_var(--border)]"
          />
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
          <select 
            value={elementFilter}
            onChange={(e) => setElementFilter(e.target.value)}
            className="shrink-0 px-4 py-2 bg-[var(--surface)] border-4 border-[var(--border)] rounded-xl text-[var(--text)] font-bold appearance-none focus:outline-none shadow-[4px_4px_0px_0px_var(--border)]"
          >
            <option value="all">All Elements</option>
            <option value="Fire">Fire</option>
            <option value="Water">Water</option>
            <option value="Earth">Earth</option>
            <option value="Air">Air</option>
            <option value="Light">Light</option>
            <option value="Dark">Dark</option>
          </select>
        </div>
      </div>

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
                    <img src={listing.card?.image_url} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
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
                      <p className="text-[10px] text-slate-500 font-bold">Seller: {listing.seller_name}</p>
                      {profile?.id !== listing.seller_id && (
                        <button 
                          onClick={() => handleBlockUser(listing.seller_id, listing.seller_name)}
                          className="text-[10px] text-red-500 hover:text-red-700 font-bold underline"
                          title="Block Seller"
                        >
                          Block
                        </button>
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
              
              <div className="flex-1 flex items-center justify-center py-4 relative">
                <div className="w-full max-w-[200px]">
                  <CardDisplay card={{ ...listing.card, is_foil: listing.is_foil }} showQuantity={false} showNewBadge={false} />
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
                    {listing.type === 'auction' ? (listing.current_bid_gold || listing.current_bid_gems || listing.price) : listing.price}
                  </div>
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
                      {expandedBids.has(listing.id) ? 'Hide Bids' : 'View Bids'}
                    </button>
                  </div>
                )}
              </div>

              <AnimatePresence>
                {expandedBids.has(listing.id) && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="bg-slate-50 border-2 border-slate-200 rounded-xl p-3 space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
                      <p className="text-[10px] font-black uppercase text-slate-400 border-b border-slate-200 pb-1">Bid History</p>
                      {loadingBids.has(listing.id) ? (
                        <div className="flex justify-center py-2">
                          <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                        </div>
                      ) : bidHistories[listing.id]?.length > 0 ? (
                        bidHistories[listing.id].map((bid, i) => (
                          <div key={i} className={cn(
                            "flex justify-between items-center text-[10px] font-bold",
                            bid.is_winning ? "text-emerald-600" : "text-slate-500"
                          )}>
                            <div className="flex items-center gap-1">
                              {bid.is_winning && <Star className="w-2.5 h-2.5 fill-current" />}
                              <span>{bid.bidder_username}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span>{bid.bid_gold || bid.bid_gems}</span>
                              <span className="text-[8px] opacity-60">{new Date(bid.bid_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-[10px] text-center text-slate-400 py-2">No bids yet</p>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

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
              ) : listing.type === 'fixed_price' ? (
                <button 
                  onClick={() => handleBuy(listing)}
                  disabled={buying === listing.id}
                  className="w-full py-3 bg-yellow-400 hover:bg-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed text-black font-black rounded-xl border-4 border-[var(--border)] transition-transform active:translate-y-1 shadow-[4px_4px_0px_0px_var(--border)] flex items-center justify-center gap-2"
                >
                  {buying === listing.id ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Coins className="w-5 h-5" />
                      Buy Now
                    </>
                  )}
                </button>
              ) : (
                <div className="flex gap-2">
                  <input 
                    type="number" 
                    min={(listing.current_bid_gold || listing.current_bid_gems || listing.price) + 1}
                    placeholder="Bid amount"
                    id={`bid-${listing.id}`}
                    className="w-full px-3 py-2 bg-[var(--bg)] border-2 border-[var(--border)] rounded-xl text-[var(--text)] font-bold focus:outline-none"
                  />
                      <button 
                        onClick={async () => {
                          const input = document.getElementById(`bid-${listing.id}`) as HTMLInputElement;
                          const bidAmount = Number(input?.value);
                          if (!bidAmount || bidAmount <= (listing.current_bid_gold || listing.current_bid_gems || listing.price)) {
                            toast.error('Bid must be higher than current bid');
                            return;
                          }
                          
                          setBuying(listing.id);
                          try {
                            const { error } = await supabase.rpc('place_bid', {
                              p_listing_id: listing.id,
                              p_bid_gold: listing.currency === 'gold' ? bidAmount : 0,
                              p_bid_gems: listing.currency === 'gems' ? bidAmount : 0
                            });
                            if (error) throw error;
                            toast.success('Bid placed successfully!', { icon: '🔨' });
                            
                            // Refresh profile to update gold/gems
                            await useProfileStore.getState().refreshProfile();
                            
                            fetchListings();
                          } catch (err: any) {
                            toast.error(err.message || 'Failed to place bid');
                          } finally {
                            setBuying(null);
                          }
                        }}
                        disabled={buying === listing.id || profile?.id === listing.seller_id}
                        className="px-4 py-2 bg-yellow-400 hover:bg-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed text-black font-black rounded-xl border-2 border-[var(--border)] transition-transform active:translate-y-1 shadow-[2px_2px_0px_0px_var(--border)] flex items-center justify-center whitespace-nowrap"
                      >
                        {buying === listing.id ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Place Bid'}
                      </button>
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
    </div>
  );
}
