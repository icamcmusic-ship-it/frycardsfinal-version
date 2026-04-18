import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { ClickableUsername } from '../components/ClickableUsername';
import { useProfileStore } from '../stores/profileStore';
import { Loader2, Trophy, Package, LayoutGrid, Repeat, Library, User } from 'lucide-react';
import { cn } from '../lib/utils';

const LEADERBOARD_TYPES = [
  { id: 'xp',           label: 'Top Level',     icon: Trophy,      scoreLabel: 'XP' },
  { id: 'collection',   label: 'Unique Cards',  icon: Library,     scoreLabel: 'Unique' },
  { id: 'packs_opened', label: 'Packs Opened',  icon: Package,     scoreLabel: 'Packs' },
  { id: 'total_trades', label: 'Top Traders',   icon: Repeat,      scoreLabel: 'Trades' },
];

export function Leaderboard() {
  const { profile } = useProfileStore();
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [type, setType] = useState('xp');

  useEffect(() => { fetchLeaderboard(); }, [type]);

  const fetchLeaderboard = async () => {
    setLoading(true);
    const { data } = await supabase.rpc('get_leaderboard', { p_type: type, p_limit: 50 });
    setLeaderboard(data || []);
    setLoading(false);
  };

  const activeType = LEADERBOARD_TYPES.find(t => t.id === type)!;

  return (
    <div className="space-y-8">
      <h1 className="text-4xl font-black text-[var(--text)] tracking-tight uppercase">Leaderboard</h1>
      <div className="flex gap-4 flex-wrap">
        {LEADERBOARD_TYPES.map(t => {
          const Icon = t.icon;
          return (
            <button key={t.id} onClick={() => setType(t.id)}
              className={cn("px-6 py-2 rounded-xl font-black border-4 border-[var(--border)] uppercase flex items-center gap-2",
                type === t.id ? "bg-blue-400 text-black" : "bg-[var(--surface)] text-[var(--text)]")}>
              <Icon className="w-4 h-4" />{t.label}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="bg-[var(--surface)] border-4 border-[var(--border)] rounded-2xl overflow-hidden shadow-[8px_8px_0px_0px_var(--border)] animate-pulse">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="flex items-center gap-4 px-6 py-4 border-b-2 border-slate-100">
              <div className="w-10 h-8 bg-slate-200 rounded"></div>
              <div className="w-8 h-8 rounded-full bg-slate-200"></div>
              <div className="h-6 bg-slate-200 rounded w-1/3 flex-1"></div>
              <div className="w-20 h-6 bg-slate-200 rounded"></div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-[var(--surface)] border-4 border-[var(--border)] rounded-2xl overflow-hidden shadow-[8px_8px_0px_0px_var(--border)]">
          {leaderboard.length === 0 ? (
            <div className="text-center py-16 font-bold text-slate-500">No data yet — be the first!</div>
          ) : leaderboard.map((entry, i) => (
            <div key={entry.user_id}
              className={cn("flex items-center gap-4 px-6 py-4 border-b-2 border-slate-100 transition-colors",
                entry.user_id === profile?.id ? "bg-blue-100 ring-4 ring-blue-500 ring-inset z-10" :
                i === 0 ? "bg-yellow-50 text-black" : i === 1 ? "bg-slate-50 text-black" : i === 2 ? "bg-orange-50 text-black" : "text-[var(--text)]")}>
              <span className={cn("w-10 text-2xl font-black text-center",
                i === 0 && "text-yellow-500", i === 1 && "text-slate-400", i === 2 && "text-orange-400")}>
                {i < 3 ? ['🥇','🥈','🥉'][i] : `#${i + 1}`}
              </span>
              {entry.avatar_url && (
                <img src={entry.avatar_url} className="w-8 h-8 rounded-full border-2 border-[var(--border)]" />
              )}
              <ClickableUsername userId={entry.user_id} username={entry.username || 'Unknown'} className="flex-1 font-black text-lg" />
              <span className="font-mono font-black text-blue-600">
                {(entry.score ?? 0).toLocaleString()} {activeType.scoreLabel}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
