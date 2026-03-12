import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { ClickableUsername } from '../components/ClickableUsername';
import { Loader2, ArrowRightLeft, Check, X, Trash2, Plus, Handshake } from 'lucide-react';
import toast from 'react-hot-toast';
import { cn } from '../lib/utils';
import { EmptyState } from '../components/EmptyState';
import { CardDisplay } from '../components/CardDisplay';
import { CardSkeleton } from '../components/CardSkeleton';

export function Trades() {
  const [trades, setTrades] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [friends, setFriends] = useState<any[]>([]);
  const [myCards, setMyCards] = useState<any[]>([]);
  const [receiverId, setReceiverId] = useState('');
  const [offeredIds, setOfferedIds] = useState<string[]>([]);
  const [requestedIds, setRequestedIds] = useState<string[]>([]);
  const [offeredGold, setOfferedGold] = useState(0);
  const [offeredGems, setOfferedGems] = useState(0);
  const [tradeMessage, setTradeMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { fetchTrades(); fetchFriends(); fetchMyCards(); }, []);

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
      p_limit: 500
    });
    setMyCards(data || []);
  };

  const respondTrade = async (offerId: string, accept: boolean) => {
    try {
      const { data, error } = await supabase.rpc('respond_to_trade_offer', { p_offer_id: offerId, p_accept: accept });
      if (error) throw error;
      // Check for application-level error
      if (data && data.success === false) throw new Error(data.error);
      fetchTrades();
      toast.success(accept ? 'Trade accepted!' : 'Trade declined!', { icon: accept ? '✅' : '❌' });
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
        p_offered_card_ids: offeredIds,
        p_requested_card_ids: requestedIds,
        p_offered_gold: offeredGold,
        p_offered_gems: offeredGems,
        p_requested_gold: 0,
        p_requested_gems: 0,
        p_message: tradeMessage,
      });
      if (error) throw error;
      
      toast.success('Trade offer sent!', { icon: '🤝' });
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
            {friends.map(f => <option key={f.id} value={f.id}>{f.username}</option>)}
          </select>
          <div>
            <p className="font-black mb-2 text-[var(--text)]">Cards you're offering (click to select):</p>
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 max-h-48 overflow-y-auto">
              {myCards.map(c => (
                <button key={c.id} onClick={() => toggleCard(c.id, offeredIds, setOfferedIds)}
                  className={cn("border-2 rounded-lg p-1 text-left bg-[var(--bg)]", offeredIds.includes(c.id) ? "border-blue-500 bg-blue-50" : "border-[var(--border)]")}>
                  <CardDisplay card={c} showQuantity={false} showNewBadge={false} />
                  <p className="text-[10px] font-bold truncate mt-1 text-[var(--text)]">{c.name}</p>
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-4">
            <div>
              <label className="font-black block mb-1 text-[var(--text)]">Gold to offer:</label>
              <input type="number" min={0} value={offeredGold} onChange={e => setOfferedGold(Number(e.target.value))}
                className="border-4 border-[var(--border)] p-3 rounded-xl font-bold w-40 bg-[var(--bg)] text-[var(--text)]" />
            </div>
            <div>
              <label className="font-black block mb-1 text-[var(--text)]">Gems to offer:</label>
              <input type="number" min={0} value={offeredGems} onChange={e => setOfferedGems(Number(e.target.value))}
                className="border-4 border-[var(--border)] p-3 rounded-xl font-bold w-40 bg-[var(--bg)] text-[var(--text)]" />
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
        {trades.length === 0 && (
          <EmptyState 
            icon={Handshake}
            title="No active trades"
            description="Create a trade offer to start swapping cards with friends!"
            ctaText="Create Trade"
            ctaAction={() => setShowCreate(true)}
          />
        )}
        {trades.map(trade => (
          <div key={trade.id} className="bg-[var(--surface)] border-4 border-[var(--border)] rounded-2xl p-6 shadow-[8px_8px_0px_0px_var(--border)]">
            <div className="flex justify-between items-start flex-wrap gap-4">
              <div>
                <p className="font-black text-lg uppercase text-[var(--text)]">{trade.sender_username} ↔ {trade.receiver_username}</p>
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
