import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { ClickableUsername } from '../components/ClickableUsername';
import { Loader2, Trophy, Package, LayoutGrid } from 'lucide-react';
import { cn } from '../lib/utils';

const LEADERBOARD_TYPES = [
  { id: 'xp',          label: 'Top Level',     icon: Trophy,      scoreLabel: 'XP' },
  { id: 'collection',  label: 'Most Cards',    icon: LayoutGrid,  scoreLabel: 'Cards' },
  { id: 'packs_opened',label: 'Packs Opened',  icon: Package,     scoreLabel: 'Packs' },
];

export function Leaderboard() {
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

      {loading ? <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-blue-500" /></div> : (
        <div className="bg-[var(--surface)] border-4 border-[var(--border)] rounded-2xl overflow-hidden shadow-[8px_8px_0px_0px_var(--border)]">
          {leaderboard.length === 0 ? (
            <div className="text-center py-16 font-bold text-slate-500">No data yet — be the first!</div>
          ) : leaderboard.map((entry, i) => (
            <div key={entry.user_id}
              className={cn("flex items-center gap-4 px-6 py-4 border-b-2 border-slate-100",
                i === 0 && "bg-yellow-50 text-black", i === 1 && "bg-slate-50 text-black", i === 2 && "bg-orange-50 text-black", i > 2 && "text-[var(--text)]")}>
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
