import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useProfileStore } from '../stores/profileStore';
import { useChatStore } from '../stores/chatStore';
import { MessageSquare, Send, X, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { ClickableUsername } from './ClickableUsername';
import toast from 'react-hot-toast';

export function ChatSidebar({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { profile } = useProfileStore();
  const { messages, loading, sending, fetchMessages, loadOlderMessages, sendMessage, resetUnread } = useChatStore();
  const [newMessage, setNewMessage] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const loadingOlderRef = useRef(false);

  useEffect(() => {
    if (isOpen) {
      if (messages.length === 0) {
        fetchMessages();
      }
      resetUnread();
    }
  }, [isOpen, messages.length, fetchMessages, resetUnread]);

  useEffect(() => {
    if (scrollRef.current) {
      // Only scroll to bottom on initial load or if we were already at the bottom
      const el = scrollRef.current;
      const isAtBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
      if (isAtBottom) {
        el.scrollTop = el.scrollHeight;
      }
    }
  }, [messages.length, isOpen]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !profile || sending) return;

    try {
      await sendMessage(newMessage.trim(), profile.id, profile.username);
      setNewMessage('');
    } catch (err: any) {
      toast.error(err.message || 'Failed to send');
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60]"
          />
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 bottom-0 w-80 bg-slate-50 border-l-4 border-black z-[70] flex flex-col shadow-[-8px_0px_0px_0px_rgba(0,0,0,0.2)]"
          >
            {/* Header */}
            <div className="bg-blue-500 p-4 border-b-4 border-black flex items-center justify-between">
              <div className="flex items-center gap-2 text-white">
                <MessageSquare className="w-5 h-5 fill-current" />
                <h2 className="font-black uppercase tracking-tight">Global Chat</h2>
              </div>
              <button 
                onClick={onClose}
                className="p-1 hover:bg-white/20 rounded-lg text-white"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Messages Area */}
            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar"
              onScroll={(e) => {
                const target = e.target as HTMLDivElement;
                if (target.scrollTop === 0 && !loading && !loadingOlderRef.current) {
                  loadingOlderRef.current = true;
                  loadOlderMessages().finally(() => { loadingOlderRef.current = false; });
                }
              }}
            >
              {loading && messages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center py-12 text-slate-400 font-bold uppercase text-[10px] tracking-widest">
                  No messages yet.
                </div>
              ) : (
                <>
                  {messages.length >= 50 && (
                    <div className="flex justify-center mb-4">
                      <button 
                        onClick={() => {
                          if (!loading && !loadingOlderRef.current) {
                            loadingOlderRef.current = true;
                            loadOlderMessages().finally(() => { loadingOlderRef.current = false; });
                          }
                        }}
                        disabled={loading}
                        className="px-4 py-2 bg-slate-200 text-slate-600 font-black text-xs uppercase rounded-lg border-2 border-slate-300 hover:bg-slate-300 transition-colors disabled:opacity-50"
                      >
                        {loading ? 'Loading...' : 'Load earlier'}
                      </button>
                    </div>
                  )}
                  {messages.map((msg, i) => (
                  <div 
                    key={msg.id || i}
                    className={cn(
                      "flex flex-col",
                      msg.user_id === profile?.id ? "items-end" : "items-start"
                    )}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <ClickableUsername 
                        userId={msg.user_id} 
                        username={msg.username} 
                        className="text-[10px] font-black text-blue-600 uppercase" 
                      />
                      <span className="text-[8px] font-bold text-slate-400">
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className={cn(
                      "px-3 py-2 rounded-2xl border-2 border-black text-xs font-bold break-words max-w-[90%] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]",
                      msg.user_id === profile?.id 
                        ? "bg-blue-400 text-black rounded-tr-none" 
                        : "bg-white text-black rounded-tl-none"
                    )}>
                      {msg.body || msg.content}
                    </div>
                  </div>
                  ))}
                </>
              )}
            </div>

            {/* Input Area */}
            <form onSubmit={handleSendMessage} className="p-4 bg-white border-t-4 border-black">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type message..."
                  maxLength={500}
                  className="flex-1 bg-slate-100 border-2 border-black rounded-xl px-4 py-2 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim() || sending || !profile}
                  className="bg-blue-500 text-white p-2.5 rounded-xl border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5 active:shadow-none transition-all disabled:opacity-50"
                >
                  {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                </button>
              </div>
            </form>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
