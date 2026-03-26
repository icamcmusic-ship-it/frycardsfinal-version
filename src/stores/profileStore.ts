import { create } from 'zustand';
import { supabase } from '../lib/supabase';

export interface Profile {
  id: string;
  username: string;
  avatar_url: string | null;
  banner_url: string | null;
  bio: string | null;
  gold_balance: number;
  gem_balance: number;
  level: number;
  xp: number;
  pity_counter: number;
  energy: number;
  energy_last_regen: string;
  created_at: string;
  max_energy: number;
  last_daily_claim: string | null;
  daily_streak: number;
  packs_opened: number;
  total_trades: number;
  total_quicksells: number;
  card_back_url: string | null;
  is_public: boolean;
  is_admin: boolean;
}

interface ProfileState {
  profile: Profile | null;
  setProfile: (profile: Profile | null) => void;
  fetchProfile: (userId: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

export const useProfileStore = create<ProfileState>((set) => ({
  profile: null,
  setProfile: (profile) => set({ profile }),
  fetchProfile: async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (data && !error) {
      set({ profile: data as Profile });
    }
  },
  refreshProfile: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (data && !error) {
        set({ profile: data as Profile });
      }
    }
  },
}));
