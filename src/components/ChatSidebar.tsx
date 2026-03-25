import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useProfileStore } from '../stores/profileStore';
import { Send, X, MessageSquare, Loader2, User as UserIcon } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface Message {
  id: string;
  user_id: string;
  content: string;
  username: string;
  avatar_url: string;
  created_at: string;
}

export function ChatSidebar({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { profile } = useProfileStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      fetchMessages();
      
      const channel = supabase
        .channel('public-chat')
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'messages_history',
          filter: 'room_id=eq.global'
        }, (payload) => {
          setMessages(prev => [...prev, payload.new as Message]);
        })
        .subscribe();

      return () => {
        channel.unsubscribe();
      };
    }
  }, [isOpen]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const fetchMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('messages_history')
        .select('*')
        .eq('room_id', 'global')
        .order('created_at', { ascending: true })
        .limit(50);

      if (error) throw error;
      setMessages(data || []);
    } catch (err) {
      console.error('Error fetching messages:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !profile) return;

    const msgContent = newMessage.trim();
    setNewMessage('');

    try {
      const { error } = await supabase
        .from('messages_history')
        .insert({
          room_id: 'global',
          user_id: profile.id,
          content: msgContent,
          username: profile.username || 'Anonymous',
          avatar_url: profile.avatar_url
        });

      if (error) throw error;
    } catch (err) {
      console.error('Error sending message:', err);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop for mobile */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[60] md:hidden"
          />
          
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 bottom-0 w-80 bg-[var(--surface)] border-l-4 border-[var(--border)] z-[70] flex flex-col shadow-[-8px_0px_0px_0px_rgba(0,0,0,0.1)]"
          >
            {/* Header */}
            <div className="p-4 border-b-4 border-[var(--border)] flex items-center justify-between bg-blue-400">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-black" />
                <h2 className="font-black text-black uppercase tracking-tight">Global Chat</h2>
              </div>
              <button 
                onClick={onClose}
                className="p-1 hover:bg-black/10 rounded-lg transition-colors"
              >
                <X className="w-6 h-6 text-black" />
              </button>
            </div>

            {/* Messages Area */}
            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide"
            >
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center py-8 text-slate-400 font-bold text-sm">
                  No messages yet. Be the first to say hi!
                </div>
              ) : (
                messages.map((msg) => (
                  <div 
                    key={msg.id} 
                    className={cn(
                      "flex flex-col gap-1",
                      msg.user_id === profile?.id ? "items-end" : "items-start"
                    )}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      {msg.user_id !== profile?.id && (
                        <span className="text-[10px] font-black text-slate-500 uppercase">{msg.username}</span>
                      )}
                    </div>
                    <div className={cn(
                      "max-w-[85%] px-3 py-2 rounded-xl border-2 text-sm font-bold shadow-[2px_2px_0px_0px_var(--border)]",
                      msg.user_id === profile?.id 
                        ? "bg-blue-100 border-blue-400 text-blue-900" 
                        : "bg-white border-[var(--border)] text-[var(--text)]"
                    )}>
                      {msg.content}
                    </div>
                    <span className="text-[8px] font-bold text-slate-400 mt-1">
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))
              )}
            </div>

            {/* Input Area */}
            <form 
              onSubmit={handleSendMessage}
              className="p-4 border-t-4 border-[var(--border)] bg-slate-50"
            >
              <div className="relative">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="w-full pl-4 pr-12 py-3 bg-white border-4 border-[var(--border)] rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-400 shadow-[4px_4px_0px_0px_var(--border)]"
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim()}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-blue-500 text-white rounded-lg border-2 border-black disabled:opacity-50 disabled:grayscale transition-transform active:scale-95"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </form>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
