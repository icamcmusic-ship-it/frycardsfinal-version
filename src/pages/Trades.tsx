import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useProfileStore } from '../stores/profileStore';
import { ClickableUsername } from '../components/ClickableUsername';
import { Loader2, ArrowRightLeft, Check, X, Trash2, Plus, Handshake, Coins, Gem } from 'lucide-react';
import toast from 'react-hot-toast';
import { cn } from '../lib/utils';
import { EmptyState } from '../components/EmptyState';
import { CardDisplay } from '../components/CardDisplay';
import { CardSkeleton } from '../components/CardSkeleton';

export function Trades() {
  const { profile } = useProfileStore();
  const [trades, setTrades] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [friends, setFriends] = useState<any[]>([]);
  const [myCards, setMyCards] = useState<any[]>([]);
  const [receiverId, setReceiverId] = useState('');
  const [receiverCards, setReceiverCards] = useState<any[]>([]);
  const [loadingReceiverCards, setLoadingReceiverCards] = useState(false);
  const [offeredIds, setOfferedIds] = useState<string[]>([]);
  const [requestedIds, setRequestedIds] = useState<string[]>([]);
  const [offeredGold, setOfferedGold] = useState(0);
  const [offeredGems, setOfferedGems] = useState(0);
  const [requestedGold, setRequestedGold] = useState(0);
  const [requestedGems, setRequestedGems] = useState(0);
  const [tradeMessage, setTradeMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { fetchTrades(); fetchFriends(); fetchMyCards(); }, []);

  useEffect(() => {
    if (receiverId) {
      fetchReceiverCards(receiverId);
    } else {
      setReceiverCards([]);
    }
  }, [receiverId]);

  const fetchReceiverCards = async (uid: string) => {
    setLoadingReceiverCards(true);
    try {
      const { data, error } = await supabase.rpc('get_other_user_collection', {
        p_target_user_id: uid
      });
      if (error) throw error;
      setReceiverCards(data || []);
    } catch (err) {
      console.error('Error fetching receiver cards:', err);
      toast.error('Failed to fetch friend\'s collection');
    } finally {
      setLoadingReceiverCards(false);
    }
  };

  const fetchTrades = async () => {
    setLoading(true);
    const { data } = await supabase.rpc('get_user_trades');
    setTrades(data || []);
    setLoading(false);
  };

  const fetchFriends = async () => {
    const { data } = await supabase.rpc('get_friends');
    setFriends(data || []);
  };

  const fetchMyCards = async () => {
    const { data } = await supabase.rpc('get_user_collection', {
      p_user_id: null, // Uses auth.uid() in the function
      p_rarity: null,
      p_sort_by: 'name',
      p_limit: 500,
      p_card_type_filter: null,
      p_is_foil: null,
      p_search: null,
      p_offset: 0
    });
    setMyCards(data || []);
  };

  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTradeExpiry = (expiresAt: string) => {
    if (!expiresAt) return 'N/A';
    const expiryTime = new Date(expiresAt).getTime();
    const diff = expiryTime - now;
    if (diff <= 0) return 'Expired';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const secs = Math.floor((diff % (1000 * 60)) / 1000);
    
    return `${hours}h ${mins}m ${secs}s`;
  };

  const respondTrade = async (offerId: string, accept: boolean) => {
    try {
      const { data, error } = await supabase.rpc('respond_to_trade_offer', { p_offer_id: offerId, p_accept: accept });
      if (error) throw error;
      // Check for application-level error
      if (data && data.success === false) throw new Error(data.error);
      fetchTrades();
      toast.success(accept ? 'Trade accepted!' : 'Trade declined!', { icon: accept ? '✅' : '❌' });
      
      // Check achievements after trade
      if (accept) {
        supabase.rpc('check_and_unlock_achievements').then(({ error }) => {
          if (error) console.error('Achievement check failed:', error);
        });
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to respond to trade');
    }
  };

  const cancelTrade = async (offerId: string) => {
    try {
      await supabase.rpc('cancel_trade', { p_offer_id: offerId });
      fetchTrades();
      toast.success('Trade cancelled', { icon: '🗑️' });
    } catch (err: any) {
      toast.error(err.message || 'Failed to cancel trade');
    }
  };

  const submitTrade = async () => {
    if (!receiverId) { toast.error('Select a friend to trade with'); return; }
    if (offeredIds.length === 0 && offeredGold === 0) { toast.error('Offer at least one card or gold'); return; }
    setSubmitting(true);
    try {
      const { data: tradeId, error } = await supabase.rpc('create_trade_rpc', {
        p_receiver_id: receiverId,
        p_offered_card_ids: offeredIds.map(id => myCards.find(c => c.user_card_id === id)?.id).filter(Boolean),
        p_requested_card_ids: requestedIds.map(id => receiverCards.find(c => c.user_card_id === id)?.id).filter(Boolean),
        p_offered_gold: offeredGold,
        p_offered_gems: offeredGems,
        p_requested_gold: requestedGold,
        p_requested_gems: requestedGems,
        p_message: tradeMessage,
      });
      if (error) throw error;
      
      toast.success('Trade offer sent!', { icon: '🤝' });
      supabase.rpc('increment_mission_progress', { p_mission_type: 'send_trade', p_amount: 1 });
      setShowCreate(false);
      setOfferedIds([]);
      setRequestedIds([]);
      setOfferedGold(0);
      setOfferedGems(0);
      setTradeMessage('');
      setReceiverId('');
      fetchTrades();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create trade');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleCard = (id: string, list: string[], setList: (v: string[]) => void) => {
    setList(list.includes(id) ? list.filter(x => x !== id) : [...list, id]);
  };

  const cardDataToDisplay = (c: any) => ({
    ...c,
    rarity: c.rarity || 'Common',
    image_url: c.image_url || '',
    name: c.name || 'Unknown Card'
  });

  const filteredTrades = trades.filter(trade => {
    if (trade.status !== 'pending') return true;
    const expiryTime = new Date(trade.expires_at).getTime();
    return expiryTime > now;
  });

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-4xl font-black text-[var(--text)] tracking-tight uppercase">Trades</h1>
          <div className="w-32 h-12 bg-slate-200 animate-pulse rounded-xl border-4 border-[var(--border)]"></div>
        </div>
        <div className="grid gap-6">
          {[1, 2].map(i => (
            <div key={i} className="bg-[var(--surface)] border-4 border-[var(--border)] rounded-2xl p-6 shadow-[8px_8px_0px_0px_var(--border)] h-40 animate-pulse">
              <div className="h-6 bg-slate-200 rounded w-1/3 mb-4"></div>
              <div className="h-4 bg-slate-200 rounded w-1/4 mb-2"></div>
              <div className="h-4 bg-slate-200 rounded w-1/5"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-4xl font-black text-[var(--text)] tracking-tight uppercase">Trades</h1>
        <button onClick={() => setShowCreate(!showCreate)}
          className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-black rounded-xl border-4 border-[var(--border)] transition-transform active:translate-y-1 shadow-[4px_4px_0px_0px_var(--border)] flex items-center gap-2">
          <Plus className="w-5 h-5" /> Create Trade
        </button>
      </div>

      {showCreate && (
        <div className="bg-[var(--surface)] border-4 border-[var(--border)] rounded-2xl p-6 shadow-[8px_8px_0px_0px_var(--border)] space-y-4">
          <h2 className="text-xl font-black uppercase text-[var(--text)]">New Trade Offer</h2>
          <select value={receiverId} onChange={e => setReceiverId(e.target.value)}
            className="w-full border-4 border-[var(--border)] p-3 rounded-xl font-bold bg-[var(--bg)] text-[var(--text)]">
            <option value="">— Select a friend —</option>
            {friends
              .filter(f => f.id !== profile?.id)
              .map(f => <option key={f.id} value={f.id}>{f.username}</option>)
            }
          </select>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4 p-4 bg-blue-50/50 border-2 border-blue-200 rounded-xl">
              <h3 className="font-black uppercase text-blue-700 flex items-center gap-2">
                <ArrowRightLeft className="w-4 h-4 rotate-180" />
                You Send
              </h3>
              <div>
                <p className="font-black mb-2 text-sm text-slate-600">Cards to offer:</p>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-48 overflow-y-auto p-1 bg-white rounded-lg border-2 border-blue-100">
                  {myCards.map(c => (
                    <button key={c.user_card_id} onClick={() => toggleCard(c.user_card_id, offeredIds, setOfferedIds)}
                      className={cn("border-2 rounded-lg p-1 text-left bg-[var(--bg)] transition-all", offeredIds.includes(c.user_card_id) ? "border-blue-500 bg-blue-50 ring-2 ring-blue-200" : "border-[var(--border)]")}>
                      <CardDisplay card={c} showQuantity={false} showNewBadge={false} />
                      <p className="text-[8px] font-bold truncate mt-1 text-[var(--text)]">{c.name}</p>
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="font-black block mb-1 text-xs text-slate-600">Gold to give:</label>
                  <div className="relative">
                    <Coins className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-yellow-600" />
                    <input type="number" min={0} value={offeredGold} onChange={e => setOfferedGold(Number(e.target.value))}
                      className="w-full border-2 border-blue-200 pl-9 pr-3 py-2 rounded-lg font-bold bg-white text-sm" />
                  </div>
                </div>
                <div className="flex-1">
                  <label className="font-black block mb-1 text-xs text-slate-600">Gems to give:</label>
                  <div className="relative">
                    <Gem className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-600" />
                    <input type="number" min={0} value={offeredGems} onChange={e => setOfferedGems(Number(e.target.value))}
                      className="w-full border-2 border-blue-200 pl-9 pr-3 py-2 rounded-lg font-bold bg-white text-sm" />
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4 p-4 bg-emerald-50/50 border-2 border-emerald-200 rounded-xl">
              <h3 className="font-black uppercase text-emerald-700 flex items-center gap-2">
                <ArrowRightLeft className="w-4 h-4" />
                You Receive
              </h3>
              {receiverId ? (
                <>
                  <div>
                    <p className="font-black mb-2 text-sm text-slate-600">Cards to request:</p>
                    {loadingReceiverCards ? (
                      <div className="flex justify-center py-4">
                        <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
                      </div>
                    ) : receiverCards.length === 0 ? (
                      <p className="text-xs text-slate-500 font-bold italic py-4 text-center bg-white rounded-lg border-2 border-dashed border-emerald-100">
                        This user has no public cards.
                      </p>
                    ) : (
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-48 overflow-y-auto p-1 bg-white rounded-lg border-2 border-emerald-100">
                        {receiverCards.map(c => (
                          <button key={c.user_card_id} onClick={() => toggleCard(c.user_card_id, requestedIds, setRequestedIds)}
                            className={cn("border-2 rounded-lg p-1 text-left bg-[var(--bg)] transition-all", requestedIds.includes(c.user_card_id) ? "border-emerald-500 bg-emerald-50 ring-2 ring-emerald-200" : "border-[var(--border)]")}>
                            <CardDisplay card={cardDataToDisplay(c)} showQuantity={false} showNewBadge={false} />
                            <p className="text-[8px] font-bold truncate mt-1 text-[var(--text)]">{c.name}</p>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="font-black block mb-1 text-xs text-slate-600">Gold to ask:</label>
                      <div className="relative">
                        <Coins className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-yellow-600" />
                        <input type="number" min={0} value={requestedGold} onChange={e => setRequestedGold(Number(e.target.value))}
                          className="w-full border-2 border-emerald-200 pl-9 pr-3 py-2 rounded-lg font-bold bg-white text-sm" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <label className="font-black block mb-1 text-xs text-slate-600">Gems to ask:</label>
                      <div className="relative">
                        <Gem className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-600" />
                        <input type="number" min={0} value={requestedGems} onChange={e => setRequestedGems(Number(e.target.value))}
                          className="w-full border-2 border-emerald-200 pl-9 pr-3 py-2 rounded-lg font-bold bg-white text-sm" />
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="h-full flex items-center justify-center py-12 text-slate-400 font-bold italic text-sm text-center">
                  Select a friend to see their cards
                </div>
              )}
            </div>
          </div>
          <div>
            <label className="font-black block mb-1 text-[var(--text)]">Message (optional):</label>
            <textarea
              value={tradeMessage}
              onChange={e => setTradeMessage(e.target.value)}
              placeholder="Add a message to your trade offer..."
              className="w-full border-4 border-[var(--border)] p-3 rounded-xl font-bold bg-[var(--bg)] text-[var(--text)] resize-none h-24"
            />
          </div>
          <button onClick={submitTrade} disabled={submitting}
            className="w-full py-3 bg-emerald-500 text-white font-black rounded-xl border-4 border-[var(--border)] shadow-[4px_4px_0px_0px_var(--border)] disabled:opacity-50">
            {submitting ? 'Sending...' : 'Send Trade Offer'}
          </button>
        </div>
      )}

      <div className="grid gap-6">
        {filteredTrades.length === 0 && (
          <EmptyState 
            icon={Handshake}
            title="No active trades"
            description="Create a trade offer to start swapping cards with friends!"
            ctaText="Create Trade"
            ctaAction={() => setShowCreate(true)}
          />
        )}
        {filteredTrades.map(trade => (
          <div key={trade.id} className="bg-[var(--surface)] border-4 border-[var(--border)] rounded-2xl p-6 shadow-[8px_8px_0px_0px_var(--border)]">
            <div className="flex justify-between items-start flex-wrap gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-black text-lg uppercase text-[var(--text)]">{trade.sender_username} ↔ {trade.receiver_username}</p>
                  {trade.status === 'pending' && (
                    <span className={cn(
                      "text-[10px] font-black px-2 py-0.5 rounded border-2 uppercase",
                      formatTradeExpiry(trade.expires_at) === 'Expired' ? "bg-red-100 text-red-600 border-red-200" : "bg-blue-100 text-blue-600 border-blue-200"
                    )}>
                      Expires in {formatTradeExpiry(trade.expires_at)}
                    </span>
                  )}
                </div>
                <p className="text-sm font-bold text-slate-500 capitalize">Status: {trade.status}</p>
                {trade.sender_gold > 0 && <p className="text-sm font-bold text-yellow-600">+{trade.sender_gold} gold offered</p>}
                {trade.sender_gems > 0 && <p className="text-sm font-bold text-emerald-600">+{trade.sender_gems} gems offered</p>}
                {trade.message && (
                  <div className="mt-2 p-3 bg-[var(--bg)] border-2 border-[var(--border)] rounded-xl">
                    <p className="text-sm font-bold text-[var(--text)] whitespace-pre-wrap">"{trade.message}"</p>
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                {trade.status === 'pending' && (
                  <>
                    <button onClick={() => respondTrade(trade.id, true)} className="p-3 bg-green-400 rounded-xl border-2 border-[var(--border)] text-black"><Check /></button>
                    <button onClick={() => respondTrade(trade.id, false)} className="p-3 bg-red-400 rounded-xl border-2 border-[var(--border)] text-white"><X /></button>
                  </>
                )}
                {['pending', 'cancelled'].includes(trade.status) && (
                  <button onClick={() => cancelTrade(trade.id)} className="p-3 bg-slate-200 rounded-xl border-2 border-[var(--border)] text-black"><Trash2 /></button>
                )}
              </div>
            </div>
            {trade.sender_cards?.length > 0 && (
              <div className="mt-4 flex gap-2 flex-wrap items-center">
                <span className="text-xs font-black text-slate-500">OFFERING:</span>
                {trade.sender_cards.map((c: any) => (
                  <div key={c.id} className="w-14 h-20 relative group">
                    <CardDisplay card={c} showQuantity={false} showNewBadge={false} />
                    <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity z-30 rounded-xl">
                      <span className="text-[8px] text-white font-bold text-center px-1">{c.name}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {trade.receiver_cards?.length > 0 && (
              <div className="mt-4 flex gap-2 flex-wrap items-center">
                <span className="text-xs font-black text-slate-500">REQUESTING:</span>
                {trade.receiver_cards.map((c: any) => (
                  <div key={c.id} className="w-14 h-20 relative group">
                    <CardDisplay card={c} showQuantity={false} showNewBadge={false} />
                    <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity z-30 rounded-xl">
                      <span className="text-[8px] text-white font-bold text-center px-1">{c.name}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
