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
  const [priceGold, setPriceGold] = useState(0);
  const [priceGems, setPriceGems] = useState(0);
  const [duration, setDuration] = useState(24);
  const [isFoil, setIsFoil] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [marketStats, setMarketStats] = useState<{ min_gold: number; min_gems: number; count: number } | null>(null);

  useEffect(() => {
    if (selectedCard) {
      fetchMarketStats();
    }
  }, [selectedCard]);

  const fetchMarketStats = async () => {
    try {
      const { data, error } = await supabase
        .from('market_listings')
        .select('price_gold, price_gems')
        .eq('card_id', selectedCard.card_id || selectedCard.id)
        .eq('status', 'active');
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        const goldPrices = data.map(l => l.price_gold).filter(p => p > 0);
        const gemPrices = data.map(l => l.price_gems).filter(p => p > 0);
        setMarketStats({
          min_gold: goldPrices.length > 0 ? Math.min(...goldPrices) : 0,
          min_gems: gemPrices.length > 0 ? Math.min(...gemPrices) : 0,
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
        setIsFoil(initialCard.is_foil || false);
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
      const { data, error } = await supabase.rpc('get_user_collection');
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
        p_price_gold: priceGold,
        p_price_gems: priceGems,
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
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
            {loading ? <Loader2 className="animate-spin text-[var(--text)]" /> : collection.map(card => (
              <button key={card.id} onClick={() => setSelectedCard(card)} className="relative border-2 border-[var(--border)] rounded-lg p-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 bg-[var(--bg)]">
                <CardDisplay card={card} showQuantity={false} showNewBadge={false} />
                <p className="text-xs font-bold mt-1 truncate text-[var(--text)]">{card.name}</p>
              </button>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-4 border-2 border-[var(--border)] p-4 rounded-xl bg-[var(--bg)]">
              {selectedCard.is_video ? (
                <video src={selectedCard.image_url} autoPlay muted loop playsInline className="w-20 h-20 object-cover rounded" />
              ) : (
                <img src={selectedCard.image_url} alt={selectedCard.name} className="w-20 h-20 object-cover rounded" />
              )}
              <div>
                <p className="font-black text-lg text-[var(--text)]">{selectedCard.name}</p>
                <button onClick={() => setSelectedCard(null)} className="text-blue-500 font-bold text-sm underline">Change Card</button>
                
                {marketStats && (
                  <div className="mt-2 p-2 bg-blue-50 border-2 border-blue-200 rounded-lg">
                    <p className="text-[10px] font-black uppercase text-blue-600 mb-1">Market Insight</p>
                    <p className="text-xs font-bold text-blue-800">
                      {marketStats.count} active listings. Lowest: {marketStats.min_gold > 0 ? `${marketStats.min_gold} Gold` : ''} {marketStats.min_gems > 0 ? `${marketStats.min_gems} Gems` : ''}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button onClick={() => setListingType('fixed_price')} className={cn("p-4 border-4 rounded-xl font-black text-[var(--text)]", listingType === 'fixed_price' ? "border-[var(--border)] bg-blue-400 text-black" : "border-[var(--border)] bg-[var(--bg)]")}>Fixed Price</button>
              <button onClick={() => setListingType('auction')} className={cn("p-4 border-4 rounded-xl font-black text-[var(--text)]", listingType === 'auction' ? "border-[var(--border)] bg-blue-400 text-black" : "border-[var(--border)] bg-[var(--bg)]")}>Auction</button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <input type="number" placeholder="Gold" onChange={e => setPriceGold(Number(e.target.value))} className="border-4 border-[var(--border)] p-3 rounded-xl font-bold bg-[var(--bg)] text-[var(--text)]" />
              <input type="number" placeholder="Gems" onChange={e => setPriceGems(Number(e.target.value))} className="border-4 border-[var(--border)] p-3 rounded-xl font-bold bg-[var(--bg)] text-[var(--text)]" />
            </div>

            <select onChange={e => setDuration(Number(e.target.value))} className="w-full border-4 border-[var(--border)] p-3 rounded-xl font-bold bg-[var(--bg)] text-[var(--text)]">
              <option value={24}>24 Hours</option>
              <option value={48}>48 Hours</option>
              <option value={72}>72 Hours</option>
            </select>

            {selectedCard.foil_quantity > 0 && (
              <label className="flex items-center gap-2 font-bold text-[var(--text)] cursor-pointer">
                <input type="checkbox" checked={isFoil} onChange={e => setIsFoil(e.target.checked)} className="w-5 h-5 rounded border-2 border-[var(--border)]" />
                List as Foil
              </label>
            )}

            <button onClick={handleSubmit} disabled={submitting} className="w-full py-4 bg-emerald-500 text-white font-black text-xl rounded-xl border-4 border-[var(--border)] shadow-[4px_4px_0px_0px_var(--border)]">
              {submitting ? 'Listing...' : 'Create Listing'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
