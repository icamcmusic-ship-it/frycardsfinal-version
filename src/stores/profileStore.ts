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
  created_at: string;
  last_daily_claim: string | null;
  daily_streak: number;
  packs_opened: number;
  total_trades: number;
  total_quicksells: number;
  card_back_url: string | null;
  is_public: boolean;
  show_online_status: boolean;
  is_admin: boolean;
  last_reward_type: string | null;
  pack_points: number;
  soft_pity_counter: number;
  foil_cards?: number;
}

interface ProfileState {
  profile: Profile | null;
  loading: boolean;
  setProfile: (profile: Profile | null) => void;
  fetchProfile: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

export const useProfileStore = create<ProfileState>((set, get) => ({
  profile: null,
  loading: true,
  setProfile: (profile) => set({ profile, loading: false }),
  fetchProfile: async () => {
    set({ loading: true });
    try {
      const { data, error } = await supabase.rpc('get_my_profile');
      if (error) throw error;
      if (data) {
        set({ profile: data as Profile, loading: false });
      } else {
        // Retry once after delay — profile may be mid-creation
        const currentProfile = get().profile;
        if (!currentProfile) {
          setTimeout(() => {
            const stillNoProfile = get().profile;
            if (!stillNoProfile) {
              get().fetchProfile().catch(err => console.error('Retry fetch profile error:', err));
            }
          }, 1500);
        }
        set({ loading: false });
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
      set({ loading: false });
    }
  },
  refreshProfile: async () => {
    try {
      const { data, error } = await supabase.rpc('get_my_profile');
      if (error) throw error;
      if (data) {
        set({ profile: data as Profile });
      }
    } catch (err) {
      console.error('Error refreshing profile:', err);
    }
  },
}));
