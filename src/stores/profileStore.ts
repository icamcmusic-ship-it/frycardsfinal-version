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
  last_reward_type: string | null;
  pack_points: number;
  soft_pity_counter: number;
  foil_cards?: number;
}

interface ProfileState {
  profile: Profile | null;
  setProfile: (profile: Profile | null) => void;
  fetchProfile: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

export const useProfileStore = create<ProfileState>((set) => ({
  profile: null,
  setProfile: (profile) => set({ profile }),
  fetchProfile: async () => {
    const { data, error } = await supabase.rpc('get_my_profile');
    
    if (data && !error) {
      set({ profile: data as Profile });
    }
  },
  refreshProfile: async () => {
    const { data, error } = await supabase.rpc('get_my_profile');
    
    if (data && !error) {
      set({ profile: data as Profile });
    }
  },
}));
