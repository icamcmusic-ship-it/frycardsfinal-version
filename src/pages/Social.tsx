import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useProfileStore } from '../stores/profileStore';
import { ClickableUsername } from '../components/ClickableUsername';
import { Loader2, Search, UserPlus, UserMinus, Check, X, Users, UserCheck } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import toast from 'react-hot-toast';

export function Social() {
  const { profile } = useProfileStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [friends, setFriends] = useState<any[]>([]);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [socialCounts, setSocialCounts] = useState({ followers: 0, following: 0 });

  useEffect(() => {
    fetchSocialData();
  }, []);

  const fetchSocialData = async () => {
    setLoading(true);
    await Promise.all([fetchFriends(), fetchPendingRequests(), fetchSocialCounts()]);
    setLoading(false);
  };

  const fetchSocialCounts = async () => {
    const { data } = await supabase.rpc('get_social_counts', { p_user_id: profile?.id });
    if (data) setSocialCounts(data);
  };

  const toggleFollow = async (userId: string) => {
    try {
      const { error } = await supabase.rpc('toggle_follow', { p_target_user_id: userId });
      if (error) throw error;
      toast.success('Follow status updated');
      fetchSocialCounts();
    } catch (err: any) {
      toast.error(err.message || 'Failed to toggle follow');
    }
  };

  const fetchFriends = async () => {
    const { data } = await supabase.rpc('get_friends');
    setFriends(data || []);
  };

  const fetchPendingRequests = async () => {
    const { data } = await supabase.rpc('get_pending_requests');
    setPendingRequests(data || []);
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery) return;
    const { data } = await supabase.rpc('search_users', { p_query: searchQuery });
    setSearchResults(data || []);
  };

  const sendRequest = async (userId: string) => {
    await supabase.rpc('send_friend_request', { p_addressee_id: userId });
    fetchPendingRequests();
  };

  const respondRequest = async (friendshipId: string, accept: boolean) => {
    const { error } = await supabase.rpc('respond_friend_request', { p_friendship_id: friendshipId, p_accept: accept });
    if (error) { toast.error(error.message); return; }
    toast.success(accept ? 'Friend added!' : 'Request declined');
    fetchSocialData();
  };

  if (loading) return <div className="flex items-center justify-center h-full"><Loader2 className="w-10 h-10 animate-spin text-blue-500" /></div>;

  return (
    <div className="space-y-8">
      <h1 className="text-4xl font-black text-[var(--text)] tracking-tight uppercase">Social</h1>

      <div className="flex gap-8">
        <div className="bg-[var(--surface)] border-4 border-[var(--border)] rounded-2xl p-4 flex-1 flex justify-around shadow-[4px_4px_0px_0px_var(--border)]">
          <div className="text-center">
            <p className="text-xs font-black uppercase text-slate-500">Followers</p>
            <p className="text-2xl font-black text-[var(--text)]">{socialCounts.followers}</p>
          </div>
          <div className="w-px bg-[var(--border)]" />
          <div className="text-center">
            <p className="text-xs font-black uppercase text-slate-500">Following</p>
            <p className="text-2xl font-black text-[var(--text)]">{socialCounts.following}</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search players..."
          className="flex-1 px-4 py-2 bg-[var(--surface)] border-4 border-[var(--border)] rounded-xl font-bold text-[var(--text)]"
        />
        <button type="submit" className="px-6 py-2 bg-blue-500 text-white font-black rounded-xl border-4 border-[var(--border)]">
          <Search className="w-5 h-5" />
        </button>
      </form>

      {searchResults.length > 0 && (
        <div className="bg-[var(--surface)] border-4 border-[var(--border)] rounded-2xl p-6 shadow-[8px_8px_0px_0px_var(--border)]">
          <h2 className="text-xl font-black uppercase mb-4 text-[var(--text)]">Search Results</h2>
          {searchResults.map(user => (
            <div key={user.id} className="flex justify-between items-center p-2 border-b-2 border-slate-100">
              <ClickableUsername userId={user.id} username={user.username} className="text-blue-600" />
              <div className="flex gap-2">
                <button onClick={() => toggleFollow(user.id)} className="p-2 bg-blue-400 rounded-lg border-2 border-[var(--border)] text-black" title="Follow/Unfollow"><UserCheck className="w-5 h-5" /></button>
                <button onClick={() => sendRequest(user.id)} className="p-2 bg-green-400 rounded-lg border-2 border-[var(--border)] text-black" title="Add Friend"><UserPlus className="w-5 h-5" /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-8">
        <div className="bg-[var(--surface)] border-4 border-[var(--border)] rounded-2xl p-6 shadow-[8px_8px_0px_0px_var(--border)]">
          <h2 className="text-xl font-black uppercase mb-4 flex items-center gap-2 text-[var(--text)]"><Users /> Friends</h2>
          {friends.map(friend => (
            <div key={friend.id} className="flex justify-between items-center p-2 border-b-2 border-slate-100">
              <ClickableUsername userId={friend.friend_id} username={friend.username} className="text-blue-600" />
            </div>
          ))}
        </div>

        <div className="bg-[var(--surface)] border-4 border-[var(--border)] rounded-2xl p-6 shadow-[8px_8px_0px_0px_var(--border)]">
          <h2 className="text-xl font-black uppercase mb-4 flex items-center gap-2 text-[var(--text)]"><UserCheck /> Pending Requests</h2>
          {pendingRequests.map(req => (
            <div key={req.id} className="flex justify-between items-center p-2 border-b-2 border-slate-100">
              <ClickableUsername userId={req.from_id} username={req.from_username} className="text-[var(--text)]" />
              <div className="flex gap-2">
                <button onClick={() => respondRequest(req.id, true)} className="p-2 bg-green-400 rounded-lg border-2 border-[var(--border)] text-black"><Check className="w-5 h-5" /></button>
                <button onClick={() => respondRequest(req.id, false)} className="p-2 bg-red-400 rounded-lg border-2 border-[var(--border)] text-white"><X className="w-5 h-5" /></button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
