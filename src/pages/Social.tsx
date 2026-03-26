import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useProfileStore } from '../stores/profileStore';
import { ClickableUsername } from '../components/ClickableUsername';
import { Loader2, Search, UserPlus, UserMinus, Check, X, Users, UserCheck, Send, MessageSquare, User } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import toast from 'react-hot-toast';
import { ConfirmModal } from '../components/ConfirmModal';

export function Social() {
  const { profile } = useProfileStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [friends, setFriends] = useState<any[]>([]);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [socialCounts, setSocialCounts] = useState({ followers: 0, following: 0 });
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
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
    fetchSocialData();
    fetchMessages();

    const channel = supabase
      .channel('global')
      .on('broadcast', { event: 'new_message' }, (payload) => {
        setMessages(prev => [payload.payload, ...prev].slice(0, 50));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchMessages = async () => {
    const { data } = await supabase
      .from('messages_history')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    setMessages(data || []);
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || sendingMessage) return;

    setSendingMessage(true);
    try {
      const messageData = {
        user_id: profile?.id,
        username: profile?.username,
        body: newMessage.trim(),
        created_at: new Date().toISOString()
      };

      const { error } = await supabase.from('messages_history').insert(messageData);
      if (error) throw error;

      await supabase.channel('global').send({
        type: 'broadcast',
        event: 'new_message',
        payload: messageData
      });

      setNewMessage('');
    } catch (err: any) {
      toast.error(err.message || 'Failed to send message');
    } finally {
      setSendingMessage(false);
    }
  };

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

  const removeFriend = async (friendId: string) => {
    setConfirmConfig({
      isOpen: true,
      title: 'Remove Friend',
      message: 'Are you sure you want to remove this friend?',
      variant: 'danger',
      onConfirm: async () => {
        try {
          const { error } = await supabase.rpc('remove_friend', { p_friend_id: friendId });
          if (error) throw error;
          toast.success('Friend removed');
          fetchFriends();
        } catch (err: any) {
          toast.error(err.message || 'Failed to remove friend');
        }
      }
    });
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

      <div className="grid md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-8">
          <div className="bg-[var(--surface)] border-4 border-[var(--border)] rounded-2xl p-6 shadow-[8px_8px_0px_0px_var(--border)] flex flex-col h-[600px]">
            <h2 className="text-xl font-black uppercase mb-4 flex items-center gap-2 text-[var(--text)]">
              <MessageSquare /> Global Chat
            </h2>
            
            <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2 custom-scrollbar flex flex-col-reverse">
              <AnimatePresence initial={false}>
                {messages.map((msg, i) => (
                  <motion.div 
                    key={msg.id || i}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={cn(
                      "p-3 rounded-xl border-2 border-[var(--border)] max-w-[80%]",
                      msg.user_id === profile?.id ? "bg-blue-50 self-end ml-auto" : "bg-[var(--bg)]"
                    )}
                  >
                    <div className="flex items-center justify-between gap-4 mb-1">
                      <ClickableUsername userId={msg.user_id} username={msg.username} className="text-xs font-black text-blue-600" />
                      <span className="text-[10px] font-bold text-slate-400">
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-sm font-bold text-[var(--text)] break-words">{msg.body}</p>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            <form onSubmit={sendMessage} className="flex gap-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 px-4 py-2 bg-[var(--bg)] border-2 border-[var(--border)] rounded-xl font-bold text-[var(--text)] focus:outline-none focus:border-blue-500"
              />
              <button 
                type="submit" 
                disabled={!newMessage.trim() || sendingMessage}
                className="p-2 bg-blue-500 text-white rounded-xl border-2 border-[var(--border)] disabled:opacity-50 shadow-[2px_2px_0px_0px_var(--border)] active:translate-y-0.5 transition-all"
              >
                {sendingMessage ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
              </button>
            </form>
          </div>

          <div className="bg-[var(--surface)] border-4 border-[var(--border)] rounded-2xl p-6 shadow-[8px_8px_0px_0px_var(--border)]">
            <h2 className="text-xl font-black uppercase mb-4 flex items-center gap-2 text-[var(--text)]"><Users /> Friends</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {friends.map(friend => (
                <div key={friend.id} className="flex justify-between items-center p-3 bg-[var(--bg)] border-2 border-[var(--border)] rounded-xl">
                  <ClickableUsername userId={friend.friend_id} username={friend.username} className="text-blue-600 font-black" />
                  <button 
                    onClick={() => removeFriend(friend.friend_id)}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    title="Remove Friend"
                  >
                    <UserMinus className="w-5 h-5" />
                  </button>
                </div>
              ))}
              {friends.length === 0 && (
                <p className="col-span-full text-center py-8 text-slate-500 font-bold">No friends yet. Search for players to add them!</p>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-8">
          <div className="bg-blue-50 border-4 border-blue-200 rounded-2xl p-6 shadow-[8px_8px_0px_0px_rgba(191,219,254,1)]">
            <h2 className="text-xl font-black uppercase mb-4 flex items-center gap-2 text-blue-900">
              <UserPlus className="w-6 h-6" /> 
              Pending Requests ({pendingRequests.length})
            </h2>
            <div className="space-y-3">
              {pendingRequests.map(req => (
                <div key={req.id} className="flex justify-between items-center p-4 bg-white border-2 border-blue-200 rounded-xl shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center border-2 border-blue-200">
                      <User className="w-6 h-6 text-blue-500" />
                    </div>
                    <div>
                      <ClickableUsername userId={req.from_id} username={req.from_username} className="text-blue-900 font-black" />
                      <p className="text-[10px] font-bold text-blue-400 uppercase">Wants to be friends</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => respondRequest(req.id, true)} 
                      className="p-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg border-2 border-black shadow-[2px_2px_0px_0px_black] transition-transform active:translate-y-0.5"
                      title="Accept"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => respondRequest(req.id, false)} 
                      className="p-2 bg-red-400 hover:bg-red-500 text-white rounded-lg border-2 border-black shadow-[2px_2px_0px_0px_black] transition-transform active:translate-y-0.5"
                      title="Decline"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
              {pendingRequests.length === 0 && (
                <p className="text-center py-4 text-slate-500 font-bold">No pending requests.</p>
              )}
            </div>
          </div>
        </div>
      </div>
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
