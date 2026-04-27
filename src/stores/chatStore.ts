import { create } from 'zustand';
import { supabase } from '../lib/supabase';

interface Message {
  id?: string;
  user_id: string;
  username: string;
  body?: string;
  content?: string;
  created_at: string;
  room_id: string;
}

interface ChatStore {
  messages: Message[];
  loading: boolean;
  sending: boolean;
  unreadCount: number;
  
  fetchMessages: () => Promise<void>;
  loadOlderMessages: () => Promise<void>;
  sendMessage: (body: string, userId: string, username: string) => Promise<void>;
  addMessage: (message: Message) => void;
  resetUnread: () => void;
  setUnreadCount: (count: number | ((prev: number) => number)) => void;
}

export const useChatStore = create<ChatStore>((set, get) => ({
  messages: [],
  loading: false,
  sending: false,
  unreadCount: 0,

  fetchMessages: async () => {
    set({ loading: true });
    try {
      const { data } = await supabase
        .from('messages_history')
        .select('*')
        .eq('room_id', 'global')
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (data) {
        set({ messages: data.reverse() });
      }
    } finally {
      set({ loading: false });
    }
  },

  loadOlderMessages: async () => {
    const state = get();
    if (state.messages.length === 0 || state.loading) return;
    set({ loading: true });
    try {
      const oldestMessage = state.messages[0];
      const { data } = await supabase
        .from('messages_history')
        .select('*')
        .eq('room_id', 'global')
        .lt('created_at', oldestMessage.created_at)
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (data && data.length > 0) {
        set({ messages: [...data.reverse(), ...state.messages] });
      }
    } finally {
      set({ loading: false });
    }
  },

  sendMessage: async (body: string, userId: string, username: string) => {
    set({ sending: true });
    try {
      const { error } = await supabase.from('messages_history').insert({
        user_id: userId,
        username: username,
        body: body,
        room_id: 'global'
      });

      if (error) throw error;
    } finally {
      set({ sending: false });
    }
  },

  addMessage: (msg) => {
    set(state => {
      if (state.messages.some(m => 
        (m.id && m.id === msg.id) || 
        (m.user_id === msg.user_id && m.body === msg.body && Math.abs(new Date(m.created_at).getTime() - new Date(msg.created_at).getTime()) < 2000)
      )) return state;
      return { messages: [...state.messages, msg] };
    });
  },

  resetUnread: () => set({ unreadCount: 0 }),
  setUnreadCount: (count) => set(state => ({ 
    unreadCount: typeof count === 'function' ? count(state.unreadCount) : count 
  }))
}));
