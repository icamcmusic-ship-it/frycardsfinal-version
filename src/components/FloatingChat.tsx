import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useProfileStore } from '../stores/profileStore';
import { MessageSquare, Send, X, Loader2, Minimize2, Maximize2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { ClickableUsername } from './ClickableUsername';
import toast from 'react-hot-toast';

export function FloatingChat() {
  const { profile } = useProfileStore();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      fetchMessages();
      
      const channel = supabase
        .channel('global_chat')
        .on('postgres_changes', { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'messages_history' 
        }, (payload) => {
          setMessages(prev => [...prev, payload.new].slice(-50));
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [isOpen]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isMinimized]);

  const fetchMessages = async () => {
    const { data } = await supabase
      .from('messages_history')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    
    if (data) {
      setMessages(data.reverse());
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !profile || sending) return;

    setSending(true);
    try {
      const { error } = await supabase.from('messages_history').insert({
        user_id: profile.id,
        username: profile.username,
        body: newMessage.trim(),
        room_id: 'global'
      });

      if (error) throw error;
      setNewMessage('');
    } catch (err: any) {
      toast.error(err.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  if (!profile) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col items-end">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ 
              opacity: 1, 
              scale: 1, 
              y: 0,
              height: isMinimized ? '60px' : '450px'
            }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className={cn(
              "bg-[var(--surface)] border-4 border-black rounded-2xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] w-80 mb-4 flex flex-col overflow-hidden transition-all duration-300",
              isMinimized && "w-48"
            )}
          >
            {/* Header */}
            <div className="bg-blue-500 p-3 border-b-4 border-black flex items-center justify-between cursor-pointer" onClick={() => setIsMinimized(!isMinimized)}>
              <div className="flex items-center gap-2 text-white">
                <MessageSquare className="w-4 h-4" />
                <span className="font-black uppercase text-xs tracking-wider">Global Chat</span>
              </div>
              <div className="flex items-center gap-1">
                <button 
                  onClick={(e) => { e.stopPropagation(); setIsMinimized(!isMinimized); }}
                  className="p-1 hover:bg-white/20 rounded transition-colors text-white"
                >
                  {isMinimized ? <Maximize2 className="w-3 h-3" /> : <Minimize2 className="w-3 h-3" />}
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); setIsOpen(false); }}
                  className="p-1 hover:bg-white/20 rounded transition-colors text-white"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>

            {!isMinimized && (
              <>
                {/* Messages */}
                <div 
                  ref={scrollRef}
                  className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar bg-slate-50"
                >
                  {messages.map((msg, i) => (
                    <div 
                      key={msg.id || i}
                      className={cn(
                        "flex flex-col",
                        msg.user_id === profile.id ? "items-end" : "items-start"
                      )}
                    >
                      <div className="flex items-center gap-1 mb-0.5">
                        <ClickableUsername 
                          userId={msg.user_id} 
                          username={msg.username} 
                          className="text-[10px] font-black text-blue-600" 
                        />
                        <span className="text-[8px] font-bold text-slate-400">
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div className={cn(
                        "px-3 py-1.5 rounded-xl border-2 border-black text-xs font-bold break-words max-w-[90%]",
                        msg.user_id === profile.id 
                          ? "bg-blue-400 text-black rounded-tr-none" 
                          : "bg-white text-black rounded-tl-none"
                      )}>
                        {msg.body}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Input */}
                <form onSubmit={handleSendMessage} className="p-3 bg-white border-t-4 border-black flex gap-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type message..."
                    className="flex-1 bg-slate-100 border-2 border-black rounded-lg px-3 py-1.5 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="submit"
                    disabled={!newMessage.trim() || sending}
                    className="bg-blue-500 text-white p-2 rounded-lg border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5 transition-all disabled:opacity-50"
                  >
                    {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </button>
                </form>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-14 h-14 rounded-full border-4 border-black flex items-center justify-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all active:translate-y-1 active:shadow-none",
          isOpen ? "bg-red-500 text-white" : "bg-blue-500 text-white animate-bounce-slow"
        )}
      >
        {isOpen ? <X className="w-6 h-6" /> : <MessageSquare className="w-6 h-6" />}
      </button>
    </div>
  );
}
