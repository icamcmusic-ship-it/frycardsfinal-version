import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Loader2, Trophy, UserPlus, UserCheck, UserMinus, Users } from 'lucide-react';
import { CardDisplay } from '../components/CardDisplay';
import { cn, getAvatarUrl, getBannerUrl, getCardBackUrl } from '../lib/utils';
import toast from 'react-hot-toast';
import { ConfirmModal } from '../components/ConfirmModal';

function OtherUserCollection({ userId }: { userId: string }) {
  const [cards, setCards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCollection = async () => {
      try {
        const { data, error } = await supabase.rpc('get_other_user_collection', { p_target_user_id: userId });
        if (error) throw error;
        setCards(data || []);
      } catch (err) {
        console.error('Error fetching other user collection:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchCollection();
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
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    variant?: 'danger' | 'warning' | 'info';
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  useEffect(() => {
    if (!userId) return;
    const fetchProfile = async () => {
      const { data } = await supabase.rpc('get_public_profile', { p_user_id: userId });
      if (data) {
        setProfile(data);
        setFollowersCount(data.followers_count || 0);
        setFollowingCount(data.following_count || 0);
        setIsFollowing(data.is_following || false);
      }
      setLoading(false);
    };
    
    fetchProfile();
  }, [userId]);

  const toggleFollow = async () => {
    if (!profile) return;
    try {
      const { error } = await supabase.rpc('toggle_follow', { p_target_user_id: userId });
      if (error) throw error;
      
      toast.success(isFollowing ? 'Unfollowed user' : 'Following user', { id: `follow-${userId}` });
      
      // Refresh counts and state
      const { data } = await supabase.rpc('get_public_profile', { p_user_id: userId });
      if (data) {
        setFollowersCount(data.followers_count || 0);
        setFollowingCount(data.following_count || 0);
        setIsFollowing(data.is_following || false);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to follow user');
    }
  };

  const sendRequest = async () => {
    await supabase.rpc('send_friend_request', { p_addressee_id: userId });
    toast.success('Friend request sent!', { id: `friend-request-${userId}` });
    setProfile((p: any) => ({ ...p, friendship_status: 'pending' }));
  };

  const removeFriend = async () => {
    setConfirmConfig({
      isOpen: true,
      title: 'Remove Friend',
      message: `Are you sure you want to remove ${profile.username} from your friends?`,
      variant: 'danger',
      onConfirm: async () => {
        await supabase.rpc('remove_friend', { p_friend_id: userId });
        toast.success('Friend removed', { id: `friend-remove-${userId}` });
        setProfile((p: any) => ({ ...p, friendship_status: 'none' }));
      }
    });
  };

  if (loading) return <div className="flex items-center justify-center h-full"><Loader2 className="w-10 h-10 animate-spin text-blue-500" /></div>;
  if (!profile) return <div className="text-center py-20 font-black text-2xl">Profile not found or private.</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Banner */}
      <div className="bg-[var(--surface)] border-4 border-[var(--border)] rounded-2xl overflow-hidden shadow-[8px_8px_0px_0px_var(--border)]">
        <div className="h-48 bg-blue-400 relative border-b-4 border-[var(--border)]">
          <img src={getBannerUrl(profile.banner_url) || ''} alt="Banner" className="w-full h-full object-cover" />
          <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white to-transparent" />
        </div>

        {/* Profile Info */}
        <div className="px-8 pb-8 relative">
          <div className="flex flex-col md:flex-row gap-6 items-start">
            {/* Avatar */}
            <div className="-mt-16 relative">
              <div className="w-32 h-32 bg-yellow-300 rounded-2xl border-4 border-[var(--border)] flex items-center justify-center shadow-[4px_4px_0px_0px_var(--border)] transform -rotate-3 overflow-hidden">
                {getAvatarUrl(profile.avatar_url) ? (
                  <img src={getAvatarUrl(profile.avatar_url)!} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <div className="text-4xl font-black text-black">
                    {profile.username?.[0]?.toUpperCase()}
                  </div>
                )}
              </div>
            </div>

            {/* Details */}
            <div className="flex-1 pt-4 w-full">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div className="flex-1">
                  <div className="space-y-2">
                    <h2 className="text-4xl font-black text-[var(--text)] uppercase">{profile.username || 'Duelist'}</h2>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1.5 bg-blue-100 px-3 py-1 rounded-full border-2 border-blue-200">
                        <Trophy className="w-4 h-4 text-blue-600" />
                        <span className="text-sm font-black text-blue-700 uppercase">Level {profile.level || 1}</span>
                      </div>
                    </div>
                  </div>
                  <p className="text-slate-500 font-bold mt-1">Joined {new Date(profile.created_at).toLocaleDateString()}</p>
                  {profile.bio && (
                    <p className="text-slate-600 font-medium mt-2 max-w-md">{profile.bio}</p>
                  )}
                </div>

                {/* Social Buttons */}
                <div className="flex flex-wrap gap-3">
                  {userId !== undefined && (
                    <>
                      {profile.friendship_status === 'accepted' ? (
                        <button onClick={removeFriend} className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 hover:bg-red-100 border-2 border-green-500 hover:border-red-500 rounded-xl font-bold text-green-700 hover:text-red-700 uppercase text-sm group transition-colors">
                          <UserCheck className="w-4 h-4 group-hover:hidden" />
                          <UserMinus className="w-4 h-4 hidden group-hover:block" />
                          <span className="group-hover:hidden">Friends</span>
                          <span className="hidden group-hover:inline">Remove</span>
                        </button>
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
                        onClick={toggleFollow}
                        className={cn(
                          "px-4 py-2 font-black text-sm uppercase rounded-xl border-2 transition-colors flex items-center gap-2",
                          isFollowing 
                            ? "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300" 
                            : "bg-purple-100 hover:bg-purple-200 text-purple-700 border-purple-300"
                        )}
                      >
                        <Users className="w-4 h-4" />
                        {isFollowing ? 'Following' : 'Follow'}
                      </button>

                      <button 
                        onClick={() => {
                          setConfirmConfig({
                            isOpen: true,
                            title: 'Block User',
                            message: `Are you sure you want to block ${profile.username}?`,
                            variant: 'danger',
                            onConfirm: async () => {
                              try {
                                const { error } = await supabase.rpc('block_user', { p_blocked_user_id: userId });
                                if (error) throw error;
                                toast.success(`${profile.username} has been blocked.`, { id: `block-${userId}` });
                                navigate('/social');
                              } catch (err: any) {
                                toast.error(err.message || 'Failed to block user');
                              }
                            }
                          });
                        }}
                        className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-600 font-black text-sm uppercase rounded-xl border-2 border-red-200 hover:border-red-300 transition-colors"
                      >
                        Block
                      </button>

                      <button 
                        onClick={() => {
                          setConfirmConfig({
                            isOpen: true,
                            title: 'Report User',
                            message: `Are you sure you want to report ${profile.username} for inappropriate behavior?`,
                            variant: 'warning',
                            onConfirm: async () => {
                              try {
                                const { error } = await supabase.from('reports').insert({
                                  target_user_id: userId,
                                  reporter_id: (await supabase.auth.getUser()).data.user?.id,
                                  reason: 'Inappropriate behavior'
                                });
                                if (error) throw error;
                                toast.success('User reported. Thank you for keeping the community safe!');
                              } catch (err: any) {
                                toast.error(err.message || 'Failed to report user');
                              }
                            }
                          });
                        }}
                        className="px-4 py-2 bg-yellow-100 hover:bg-yellow-200 text-yellow-700 font-black text-sm uppercase rounded-xl border-2 border-yellow-200 hover:border-yellow-300 transition-colors"
                      >
                        Report
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-[var(--bg)] border-2 border-[var(--border)] rounded-xl p-4 shadow-[2px_2px_0px_0px_var(--border)]">
                  <p className="text-xs text-slate-500 font-bold uppercase mb-1">Unique Cards</p>
                  <p className="text-2xl font-black text-blue-600">{profile.unique_cards || 0}</p>
                </div>
                <div className="bg-[var(--bg)] border-2 border-[var(--border)] rounded-xl p-4 shadow-[2px_2px_0px_0px_var(--border)]">
                  <p className="text-xs text-slate-500 font-bold uppercase mb-1">Packs Opened</p>
                  <p className="text-2xl font-black text-purple-600">{profile.packs_opened || 0}</p>
                </div>
                <div className="bg-[var(--bg)] border-2 border-[var(--border)] rounded-xl p-4 shadow-[2px_2px_0px_0px_var(--border)]">
                  <p className="text-xs text-slate-500 font-bold uppercase mb-1">Total Trades</p>
                  <p className="text-2xl font-black text-[var(--text)]">{profile.total_trades ?? 0}</p>
                </div>
                <div className="bg-[var(--bg)] border-2 border-[var(--border)] rounded-xl p-4 shadow-[2px_2px_0px_0px_var(--border)]">
                  <p className="text-xs text-slate-500 font-bold uppercase mb-1">Followers</p>
                  <p className="text-2xl font-black text-emerald-600">{followersCount}</p>
                </div>
              </div>

              {/* Card Back Preview */}
              <div className="mt-6">
                <p className="text-xs text-slate-500 font-bold uppercase mb-2">Equipped Card Back</p>
                <div className="w-24 aspect-[3/4] rounded-xl border-4 border-[var(--border)] bg-gray-200 overflow-hidden shadow-[4px_4px_0px_0px_var(--border)]">
                  <img 
                    src={getCardBackUrl(profile.card_back_url)} 
                    alt="Card Back" 
                    className="w-full h-full object-cover" 
                  />
                </div>
              </div>

              <button
                onClick={() => setShowCollection(!showCollection)}
                className="mt-6 w-full px-6 py-3 bg-blue-500 hover:bg-blue-600 transition-colors text-white font-black rounded-xl border-4 border-[var(--border)] shadow-[4px_4px_0px_0px_var(--border)] uppercase tracking-wider active:translate-y-1 transition-transform"
              >
                {showCollection ? 'Hide Collection' : 'View Collection'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {showCollection && userId && <OtherUserCollection userId={userId} />}

      <ConfirmModal
        isOpen={confirmConfig.isOpen}
        onClose={() => setConfirmConfig({ ...confirmConfig, isOpen: false })}
        onConfirm={confirmConfig.onConfirm}
        title={confirmConfig.title}
        message={confirmConfig.message}
        variant={confirmConfig.variant}
      />
    </div>
  );
}
