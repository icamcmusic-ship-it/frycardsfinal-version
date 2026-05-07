import { create } from 'zustand';
import { supabase } from '../lib/supabase';

export type RewardType = 'gold' | 'gems' | 'pack' | 'xp' | 'card';

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
  last_reward_type: RewardType | null;
  pack_points: number;
  soft_pity_counter: number;
}

export interface CollectionStats {
  unique_cards: number;
  total_cards: number;
  total_possible: number;
  foil_cards: number;
  completion_pct: number;
}

interface ProfileState {
  profile: Profile | null;
  collectionStats: CollectionStats | null;
  loading: boolean;
  setProfile: (profile: Profile | null) => void;
  fetchProfile: (retryCount?: number) => Promise<void>;
  refreshProfile: () => Promise<void>;
  fetchCollectionStats: () => Promise<CollectionStats | null>;
}

export const useProfileStore = create<ProfileState>((set, get) => ({
  profile: null,
  collectionStats: null,
  loading: true,
  setProfile: (profile) => set({ profile, loading: false }),
  fetchCollectionStats: async () => {
    try {
      const { data } = await supabase.rpc('get_my_collection_stats');
      if (data) {
        set({ collectionStats: data });
        return data;
      }
      return null;
    } catch (err) {
      console.error('Error fetching collection stats:', err);
      return null;
    }
  },
  fetchProfile: async (retryCount = 0) => {
    set({ loading: true });
    try {
      const { data, error } = await supabase.rpc('get_my_profile');
      if (error) throw error;
      if (data) {
        set({ profile: data as Profile, loading: false });
        get().fetchCollectionStats();
      } else {
        // Retry up to 3 times after delay — profile may be mid-creation
        const currentProfile = get().profile;
        if (!currentProfile && retryCount < 3) {
          setTimeout(() => {
            const stillNoProfile = get().profile;
            if (!stillNoProfile) {
              get().fetchProfile(retryCount + 1).catch(err => console.error('Retry fetch profile error:', err));
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
