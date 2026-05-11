import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { ClickableUsername } from '../components/ClickableUsername';
import { useProfileStore } from '../stores/profileStore';
import { Loader2, Trophy, Package, LayoutGrid, Repeat, Library, Star, TrendingUp, Shield } from 'lucide-react';
import { cn } from '../lib/utils';

const LEADERBOARD_TYPES = [
  { id: 'xp',           label: 'Top Level',     icon: Trophy,      scoreLabel: 'XP',      isRanked: false },
  { id: 'ranked',       label: 'Ranked ELO',    icon: Star,        scoreLabel: 'Rating',  isRanked: true  },
  { id: 'collection',   label: 'Unique Cards',  icon: Library,     scoreLabel: 'Unique',  isRanked: false },
  { id: 'packs_opened', label: 'Packs Opened',  icon: Package,     scoreLabel: 'Packs',   isRanked: false },
  { id: 'total_trades', label: 'Top Traders',   icon: Repeat,      scoreLabel: 'Trades',  isRanked: false },
];

interface RankedEntry {
  rank: number;
  user_id: string;
  username: string;
  avatar_url: string | null;
  rating: number;
  wins: number;
  losses: number;
  draws: number;
  win_rate: number;
  highest: number;
}

function getRatingTier(rating: number): { label: string; color: string; bg: string } {
  if (rating >= 2000) return { label: 'Legend',   color: 'text-red-400',    bg: 'bg-red-900/30 border-red-700/40' };
  if (rating >= 1800) return { label: 'Master',   color: 'text-orange-400', bg: 'bg-orange-900/30 border-orange-700/40' };
  if (rating >= 1600) return { label: 'Diamond',  color: 'text-cyan-400',   bg: 'bg-cyan-900/30 border-cyan-700/40' };
  if (rating >= 1400) return { label: 'Platinum', color: 'text-purple-400', bg: 'bg-purple-900/30 border-purple-700/40' };
  if (rating >= 1200) return { label: 'Gold',     color: 'text-yellow-400', bg: 'bg-yellow-900/30 border-yellow-700/40' };
  if (rating >= 1100) return { label: 'Silver',   color: 'text-slate-300',  bg: 'bg-slate-700/30 border-slate-600/40' };
  return                     { label: 'Bronze',   color: 'text-amber-700',  bg: 'bg-amber-900/20 border-amber-800/40' };
}

export function Leaderboard() {
  const { profile } = useProfileStore();
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [type, setType] = useState('xp');
  const currentTypeDef = LEADERBOARD_TYPES.find(t => t.id === type)!;

  useEffect(() => { fetchLeaderboard(); }, [type]);

  const fetchLeaderboard = async () => {
    setLoading(true);
    if (type === 'ranked') {
      const { data } = await supabase.rpc('get_ranked_leaderboard', { p_limit: 50 });
      setLeaderboard(data || []);
    } else {
      const { data } = await supabase.rpc('get_leaderboard', { p_type: type, p_limit: 50 });
      setLeaderboard(data || []);
    }
    setLoading(false);
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div>
        <h1 className="text-4xl font-black text-[var(--text)] tracking-tight uppercase">Leaderboard</h1>
        <p className="text-[var(--text-muted)] text-sm mt-1 font-bold uppercase tracking-widest">Hall of Fame</p>
      </div>

      {/* Tab selector */}
      <div className="flex gap-2 flex-wrap">
        {LEADERBOARD_TYPES.map(t => {
          const Icon = t.icon;
          const active = type === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setType(t.id)}
              className={cn(
                'px-4 py-2 rounded-xl font-black border-4 border-[var(--border)] uppercase text-sm flex items-center gap-2 transition-all',
                active
                  ? t.id === 'ranked'
                    ? 'bg-amber-400 text-black shadow-[4px_4px_0px_0px_var(--border)]'
                    : 'bg-blue-400 text-black shadow-[4px_4px_0px_0px_var(--border)]'
                  : 'bg-[var(--surface)] text-[var(--text)] hover:bg-[var(--bg)]'
              )}
            >
              <Icon className="w-4 h-4" />{t.label}
              {t.id === 'ranked' && <span className="text-[9px] bg-amber-500 text-black px-1.5 py-0.5 rounded-full">NEW</span>}
            </button>
          );
        })}
      </div>

      {/* Ranked explanation */}
      {type === 'ranked' && (
        <div className="bg-amber-900/20 border-4 border-amber-700/40 rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-amber-500/20 rounded-xl flex items-center justify-center border-2 border-amber-500/40">
              <TrendingUp className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="font-black text-amber-300 uppercase tracking-tight">ELO Rating System</h3>
              <p className="text-amber-500/70 text-xs font-bold">Based on PvP match performance</p>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { r: 1000, l: 'Bronze' }, { r: 1100, l: 'Silver' }, { r: 1200, l: 'Gold' },
              { r: 1400, l: 'Platinum' }, { r: 1600, l: 'Diamond' }, { r: 1800, l: 'Master' }, { r: 2000, l: 'Legend' }
            ].map(tier => {
              const t = getRatingTier(tier.r);
              return (
                <div key={tier.l} className={cn('rounded-lg px-2 py-1.5 border text-center', t.bg)}>
                  <p className={cn('text-[10px] font-black uppercase', t.color)}>{tier.l}</p>
                  <p className="text-[9px] text-white/40">{tier.r}+ ELO</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="bg-[var(--surface)] border-4 border-[var(--border)] rounded-2xl overflow-hidden shadow-[8px_8px_0px_0px_var(--border)] animate-pulse">
          {[1,2,3,4,5].map(i => (
            <div key={i} className="flex items-center gap-4 px-6 py-4 border-b-2 border-slate-100">
              <div className="w-10 h-8 bg-slate-200 rounded" />
              <div className="w-8 h-8 rounded-full bg-slate-200" />
              <div className="h-6 bg-slate-200 rounded w-1/3 flex-1" />
              <div className="w-20 h-6 bg-slate-200 rounded" />
            </div>
          ))}
        </div>
      ) : leaderboard.length === 0 ? (
        <div className="bg-[var(--surface)] border-4 border-[var(--border)] rounded-2xl p-12 text-center shadow-[8px_8px_0px_0px_var(--border)]">
          <Shield className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-400 font-bold">
            {type === 'ranked' ? 'No ranked matches played yet. PvP coming soon!' : 'No data yet. Be the first!'}
          </p>
        </div>
      ) : (
        <div className="bg-[var(--surface)] border-4 border-[var(--border)] rounded-2xl overflow-hidden shadow-[8px_8px_0px_0px_var(--border)]">
          {leaderboard.map((entry: any, idx) => {
            const isMe = profile?.id === (entry.id || entry.user_id);
            const rank = entry.rank ?? idx + 1;
            const rankEmoji = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : null;
            const score = type === 'ranked' ? entry.rating : entry.score;
            const ratingTier = type === 'ranked' ? getRatingTier(entry.rating) : null;

            return (
              <div
                key={entry.id || entry.user_id || idx}
                className={cn(
                  'flex items-center gap-4 px-6 py-4 border-b-2 border-[var(--border)] transition-colors',
                  isMe ? 'bg-blue-50 dark:bg-blue-950/30' : 'hover:bg-[var(--bg)]',
                  idx === leaderboard.length - 1 && 'border-b-0'
                )}
              >
                {/* Rank */}
                <div className="w-10 text-center flex-shrink-0">
                  {rankEmoji ? (
                    <span className="text-2xl">{rankEmoji}</span>
                  ) : (
                    <span className="text-lg font-black text-[var(--text-muted)]">#{rank}</span>
                  )}
                </div>

                {/* Avatar */}
                <div className="w-9 h-9 rounded-full bg-[var(--bg)] border-2 border-[var(--border)] overflow-hidden flex-shrink-0">
                  {entry.avatar_url && entry.avatar_url !== 'default' ? (
                    <img src={entry.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-sm font-black text-[var(--text-muted)]">
                      {(entry.username || '?')[0].toUpperCase()}
                    </div>
                  )}
                </div>

                {/* Name + tier badge */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <ClickableUsername
                      userId={entry.id || entry.user_id}
                      username={entry.username || 'Unknown'}
                      className={cn('font-black truncate', isMe && 'text-blue-600')}
                    />
                    {isMe && (
                      <span className="text-[8px] font-black uppercase px-1.5 py-0.5 bg-blue-500 text-white rounded-full flex-shrink-0">
                        You
                      </span>
                    )}
                    {ratingTier && (
                      <span className={cn('text-[9px] font-black uppercase px-2 py-0.5 rounded-full border flex-shrink-0', ratingTier.bg, ratingTier.color)}>
                        {ratingTier.label}
                      </span>
                    )}
                  </div>
                  {/* W/L for ranked */}
                  {type === 'ranked' && (
                    <p className="text-[10px] text-[var(--text-muted)] font-bold mt-0.5">
                      {entry.wins}W · {entry.losses}L
                      {entry.win_rate > 0 && <span className="ml-1 text-emerald-500">{entry.win_rate}%</span>}
                      {entry.highest > entry.rating && (
                        <span className="ml-1 text-amber-500">Peak {entry.highest}</span>
                      )}
                    </p>
                  )}
                </div>

                {/* Score */}
                <div className="flex-shrink-0 text-right">
                  <div className={cn(
                    'text-lg font-black font-mono',
                    type === 'ranked' && ratingTier ? ratingTier.color : 'text-[var(--text)]'
                  )}>
                    {score?.toLocaleString()}
                  </div>
                  <div className="text-[9px] text-[var(--text-muted)] uppercase font-bold">
                    {currentTypeDef.scoreLabel}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
