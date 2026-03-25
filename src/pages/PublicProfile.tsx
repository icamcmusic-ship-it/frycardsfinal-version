import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Loader2, Trophy, UserPlus, UserCheck } from 'lucide-react';
import { CardDisplay } from '../components/CardDisplay';
import { getAvatarUrl, getBannerUrl } from '../lib/utils';
import toast from 'react-hot-toast';

function OtherUserCollection({ userId }: { userId: string }) {
  const [cards, setCards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.rpc('get_other_user_collection', { p_target_user_id: userId }).then(({ data }) => {
      setCards(data || []);
      setLoading(false);
    });
  }, [userId]);

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>;

  return (
    <div className="mt-8">
      <h2 className="text-2xl font-black uppercase mb-4">Collection</h2>
      {cards.length === 0 ? (
        <p className="text-slate-500 font-bold">This user has no public cards or their collection is empty.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {cards.map(card => (
            <div key={card.id} className="relative group">
              <CardDisplay card={card} showQuantity={true} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function PublicProfile() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showCollection, setShowCollection] = useState(false);

  useEffect(() => {
    if (!userId) return;
    supabase.rpc('get_public_profile', { p_user_id: userId }).then(({ data }) => {
      setProfile(data);
      setLoading(false);
    });
  }, [userId]);

  const sendRequest = async () => {
    await supabase.rpc('send_friend_request', { p_addressee_id: userId });
    setProfile((p: any) => ({ ...p, friendship_status: 'pending' }));
  };

  if (loading) return <div className="flex items-center justify-center h-full"><Loader2 className="w-10 h-10 animate-spin text-blue-500" /></div>;
  if (!profile) return <div className="text-center py-20 font-black text-2xl">Profile not found or private.</div>;

  return (
    <div className="space-y-8 max-w-2xl mx-auto">
      {/* Banner */}
      {getBannerUrl(profile.banner_url) && (
        <div className="w-full h-40 rounded-2xl border-4 border-black overflow-hidden">
          <img src={getBannerUrl(profile.banner_url)!} className="w-full h-full object-cover" />
        </div>
      )}
      <div className="bg-[var(--surface)] border-4 border-[var(--border)] rounded-2xl p-8 shadow-[8px_8px_0px_0px_var(--border)]">
        <div className="flex items-start gap-6">
          {getAvatarUrl(profile.avatar_url)
            ? <img src={getAvatarUrl(profile.avatar_url)!} className="w-24 h-24 rounded-full border-4 border-[var(--border)]" />
            : <div className="w-24 h-24 rounded-full bg-blue-400 border-4 border-[var(--border)] flex items-center justify-center text-3xl font-black text-white">
                {profile.username?.[0]?.toUpperCase()}
              </div>
          }
          <div className="flex-1">
            <h1 className="text-3xl font-black uppercase text-[var(--text)]">{profile.username}</h1>
            {profile.bio && <p className="text-slate-600 mt-1 font-bold">{profile.bio}</p>}
            <p className="text-sm font-bold text-slate-400 mt-1 uppercase tracking-wider">Level {profile.level}</p>
            {userId !== undefined && (
              <div className="flex items-center gap-3 mt-3">
                {profile.friendship_status === 'accepted' ? (
                  <span className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 border-2 border-green-500 rounded-xl font-bold text-green-700 uppercase text-sm">
                    <UserCheck className="w-4 h-4" /> Friends
                  </span>
                ) : profile.friendship_status === 'pending' ? (
                  <span className="inline-flex px-4 py-2 bg-yellow-100 border-2 border-yellow-400 rounded-xl font-bold text-yellow-700 uppercase text-sm">
                    Request Pending
                  </span>
                ) : (
                  <button onClick={sendRequest}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white font-black rounded-xl border-4 border-[var(--border)] shadow-[4px_4px_0px_0px_var(--border)] transition-transform active:translate-y-1 uppercase text-sm">
                    <UserPlus className="w-4 h-4" /> Add Friend
                  </button>
                )}
                
                <button 
                  onClick={async () => {
                    if (window.confirm(`Are you sure you want to block ${profile.username}?`)) {
                      try {
                        const { error } = await supabase.rpc('block_user', { p_blocked_user_id: userId });
                        if (error) throw error;
                        toast.success(`${profile.username} has been blocked.`);
                        navigate('/social');
                      } catch (err: any) {
                        toast.error(err.message || 'Failed to block user');
                      }
                    }
                  }}
                  className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-600 font-black text-sm uppercase rounded-xl border-2 border-red-200 hover:border-red-300 transition-colors"
                >
                  Block
                </button>
              </div>
            )}
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4 mt-6">
          {[
            { label: 'Unique Cards', value: profile.unique_cards },
            { label: 'Packs Opened', value: profile.packs_opened },
            { label: 'Total Trades', value: profile.total_trades ?? 0 },
          ].map(s => (
            <div key={s.label} className="bg-[var(--bg)] border-2 border-[var(--border)] rounded-xl p-4 text-center">
              <p className="text-2xl font-black text-[var(--text)]">{(s.value ?? 0).toLocaleString()}</p>
              <p className="text-xs text-slate-500 font-bold uppercase mt-1">{s.label}</p>
            </div>
          ))}
        </div>
        
        <button
          onClick={() => setShowCollection(!showCollection)}
          className="mt-6 w-full px-6 py-3 bg-blue-500 hover:bg-blue-600 transition-colors text-white font-black rounded-xl border-4 border-[var(--border)] shadow-[4px_4px_0px_0px_var(--border)] uppercase tracking-wider active:translate-y-1 transition-transform"
        >
          {showCollection ? 'Hide Collection' : 'View Collection'}
        </button>

        {showCollection && userId && <OtherUserCollection userId={userId} />}
      </div>
    </div>
  );
}
