import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { X, Loader2, Coins, Gem, Clock, Package } from 'lucide-react';
import { cn } from '../lib/utils';
import { CardDisplay } from './CardDisplay';
import toast from 'react-hot-toast';

interface CreateListingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialCard?: any;
}

export function CreateListingModal({ isOpen, onClose, onSuccess, initialCard }: CreateListingModalProps) {
  const [collection, setCollection] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCard, setSelectedCard] = useState<any>(null);
  const [listingType, setListingType] = useState<'fixed_price' | 'auction'>('fixed_price');
  const [currency, setCurrency] = useState<'gold' | 'gems'>('gold');
  const [price, setPrice] = useState(0);
  const [duration, setDuration] = useState(24);
  const [isFoil, setIsFoil] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [marketStats, setMarketStats] = useState<{ min_gold: number; min_gems: number; count: number } | null>(null);

  useEffect(() => {
    if (selectedCard) {
      fetchMarketStats();
    }
  }, [selectedCard]);

  const RARITY_FLOOR_GOLD: Record<string, number> = {
    Common: 15, Uncommon: 40, Rare: 150,
    'Super-Rare': 400, Mythic: 800, Divine: 1500,
  };

  useEffect(() => {
    if (selectedCard && price === 0) {
      setPrice(RARITY_FLOOR_GOLD[selectedCard.rarity] ?? 15);
    }
  }, [selectedCard]);

  const fetchMarketStats = async () => {
    if (!selectedCard) return;
    try {
      const { data, error } = await supabase.rpc('get_active_listings', {
        p_limit: 10,
        p_offset: 0,
        p_rarity: null,
        p_listing_type: 'fixed_price',
        p_search: selectedCard.name,
        p_sort_by: 'price'
      });
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        const goldListings = data.filter((l: any) => l.currency === 'gold');
        const gemListings = data.filter((l: any) => l.currency === 'gems');

        setMarketStats({
          min_gold: goldListings.length > 0 ? Math.min(...goldListings.map((l: any) => l.price)) : 0,
          min_gems: gemListings.length > 0 ? Math.min(...gemListings.map((l: any) => l.price)) : 0,
          count: data.length
        });
      } else {
        setMarketStats(null);
      }
    } catch (err) {
      console.error('Error fetching market stats:', err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      if (initialCard) {
        setSelectedCard(initialCard);
        setIsFoil(initialCard.is_foil || (initialCard.foil_quantity ?? 0) > 0);
      } else {
        fetchCollection();
      }
    } else {
      document.body.style.overflow = 'unset';
      setSelectedCard(null);
      setIsFoil(false);
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, initialCard]);

  const fetchCollection = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('get_user_collection', {
        p_user_id: null,
        p_rarity: null,
        p_sort_by: 'name',
        p_is_foil: null,
        p_search: null,
        p_limit: 1000,
        p_offset: 0
      });
      if (error) throw error;
      setCollection(data || []);
    } catch (err) {
      console.error('Error fetching collection:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedCard) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.rpc('create_market_listing_safe', {
        p_card_id: selectedCard.id,
        p_listing_type: listingType,
        p_price_gold: currency === 'gold' ? price : 0,
        p_price_gems: currency === 'gems' ? price : 0,
        p_expires_hours: duration,
        p_is_foil: isFoil
      });
      if (error) throw error;
      toast.success('Listing created!');
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create listing');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-[var(--surface)] border-4 border-[var(--border)] rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-[8px_8px_0px_0px_var(--border)]">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-black uppercase text-[var(--text)]">Create Listing</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full text-[var(--text)]"><X /></button>
        </div>

        {!selectedCard ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
            {loading ? (
              <div className="col-span-full flex justify-center py-12">
                <Loader2 className="w-12 h-12 animate-spin text-blue-500" />
              </div>
            ) : collection.map(card => (
              <button 
                key={card.id} 
                onClick={() => setSelectedCard(card)} 
                className="group relative flex flex-col gap-2 transition-transform hover:-translate-y-1"
              >
                <div className="relative w-full aspect-[3/4] border-4 border-[var(--border)] rounded-2xl overflow-hidden shadow-[4px_4px_0px_0px_var(--border)] group-hover:shadow-[6px_6px_0px_0px_var(--border)] transition-all">
                  <CardDisplay card={card} showQuantity={false} showNewBadge={false} />
                  <div className="absolute inset-0 bg-blue-500/0 group-hover:bg-blue-500/10 transition-colors pointer-events-none" />
                </div>
                <div className="px-1 text-center">
                  <p className="text-sm font-black uppercase truncate text-[var(--text)]">{card.name}</p>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    {card.rarity}
                  </p>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="flex flex-col gap-4">
              <div className="w-full max-w-[280px] mx-auto">
                <CardDisplay card={selectedCard} showQuantity={false} showNewBadge={false} />
              </div>
              <button 
                onClick={() => setSelectedCard(null)} 
                className="py-2 px-4 bg-[var(--bg)] border-2 border-[var(--border)] rounded-xl font-black text-sm uppercase text-[var(--text)] hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Change Card
              </button>
            </div>

            <div className="space-y-4">
              {marketStats && (
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border-4 border-blue-200 dark:border-blue-800 rounded-xl">
                  <div className="flex items-center gap-2 mb-1">
                    <Package className="w-4 h-4 text-blue-600" />
                    <p className="text-[10px] font-black uppercase text-blue-600">Market Insight</p>
                  </div>
                  <p className="text-xs font-bold text-blue-800 dark:text-blue-200">
                    {marketStats.count} active listings. Lowest: {marketStats.min_gold > 0 ? `${marketStats.min_gold} Gold` : ''} {marketStats.min_gems > 0 ? `${marketStats.min_gems} Gems` : ''}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => setListingType('fixed_price')} className={cn("p-3 border-4 rounded-xl font-black text-sm uppercase transition-all", listingType === 'fixed_price' ? "border-[var(--border)] bg-blue-400 text-black shadow-[4px_4px_0px_0px_var(--border)]" : "border-slate-300 bg-[var(--bg)] text-slate-500 hover:border-slate-400")}>Fixed Price</button>
                <button onClick={() => setListingType('auction')} className={cn("p-3 border-4 rounded-xl font-black text-sm uppercase transition-all", listingType === 'auction' ? "border-[var(--border)] bg-blue-400 text-black shadow-[4px_4px_0px_0px_var(--border)]" : "border-slate-300 bg-[var(--bg)] text-slate-500 hover:border-slate-400")}>Auction</button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => setCurrency('gold')} className={cn("p-3 border-4 rounded-xl font-black text-sm uppercase transition-all flex items-center justify-center gap-2", currency === 'gold' ? "border-[var(--border)] bg-yellow-400 text-black shadow-[4px_4px_0px_0px_var(--border)]" : "border-slate-300 bg-[var(--bg)] text-slate-500 hover:border-slate-400")}><Coins className="w-4 h-4" /> Gold</button>
                <button onClick={() => setCurrency('gems')} className={cn("p-3 border-4 rounded-xl font-black text-sm uppercase transition-all flex items-center justify-center gap-2", currency === 'gems' ? "border-[var(--border)] bg-emerald-400 text-black shadow-[4px_4px_0px_0px_var(--border)]" : "border-slate-300 bg-[var(--bg)] text-slate-500 hover:border-slate-400")}><Gem className="w-4 h-4" /> Gems</button>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">{listingType === 'auction' ? 'Starting Bid' : 'Price'} ({currency === 'gold' ? 'Gold' : 'Gems'})</label>
                <div className="relative">
                  <input type="number" min="0" placeholder="0" value={price || ''} onChange={e => setPrice(Number(e.target.value))} className="w-full border-4 border-[var(--border)] p-3 rounded-xl font-black bg-[var(--bg)] text-[var(--text)] focus:outline-none focus:border-blue-500 shadow-[2px_2px_0px_0px_var(--border)]" />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2">
                    {currency === 'gold' ? <Coins className="w-5 h-5 text-yellow-500" /> : <Gem className="w-5 h-5 text-emerald-500" />}
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Duration</label>
                <div className="relative">
                  <select value={duration} onChange={e => setDuration(Number(e.target.value))} className="w-full border-4 border-[var(--border)] p-3 rounded-xl font-black bg-[var(--bg)] text-[var(--text)] appearance-none focus:outline-none focus:border-blue-500 shadow-[2px_2px_0px_0px_var(--border)]">
                    <option value={12}>12 Hours</option>
                    <option value={24}>24 Hours</option>
                    <option value={48}>48 Hours</option>
                    <option value={72}>72 Hours</option>
                  </select>
                  <Clock className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {selectedCard.foil_quantity > 0 && (
                <label className="flex items-center gap-3 p-3 bg-[var(--bg)] border-2 border-[var(--border)] rounded-xl font-black text-sm uppercase text-[var(--text)] cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors">
                  <input type="checkbox" checked={isFoil} onChange={e => setIsFoil(e.target.checked)} className="w-5 h-5 rounded border-4 border-[var(--border)] text-blue-500 focus:ring-0" />
                  List as Foil Card
                </label>
              )}

              <div className="flex flex-col gap-1">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">
                  ⚠️ 10% marketplace fee applied — you receive 90% of the sale price.
                </p>
                <button 
                  onClick={handleSubmit} 
                  disabled={submitting} 
                  className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xl rounded-xl border-4 border-[var(--border)] shadow-[4px_4px_0px_0px_var(--border)] transition-all active:translate-y-1 active:shadow-none uppercase disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="w-6 h-6 animate-spin" />
                      <span>Listing...</span>
                    </div>
                  ) : 'Confirm Listing'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
