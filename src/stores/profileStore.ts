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
}

interface ProfileState {
  profile: Profile | null;
  setProfile: (profile: Profile | null) => void;
  fetchProfile: (userId: string) => Promise<void>;
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
}));
