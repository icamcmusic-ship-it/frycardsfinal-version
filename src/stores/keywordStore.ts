import { create } from 'zustand';
import { supabase } from '../lib/supabase';

export interface KeywordDefinition {
  keyword: string;
  tier: number;
  name: string;
  short_description: string;
  rules_text: string;
  example_card_name?: string;
}

interface KeywordState {
  definitions: KeywordDefinition[];
  loading: boolean;
  error: string | null;
  fetchDefinitions: () => Promise<void>;
  getDefinition: (keyword: string, tier: number) => KeywordDefinition | undefined;
}

export const useKeywordStore = create<KeywordState>((set, get) => ({
  definitions: [],
  loading: false,
  error: null,
  fetchDefinitions: async () => {
    if (get().definitions.length > 0) return;
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase.rpc('get_keyword_definitions');
      if (error) throw error;
      set({ definitions: data as KeywordDefinition[], loading: false });
    } catch (err: any) {
      console.error('Error fetching keyword definitions:', err);
      set({ error: err.message || 'Failed to fetch keywords', loading: false });
    }
  },
  getDefinition: (keyword: string, tier: number) => {
    return get().definitions.find(
      (d) => d.keyword.toLowerCase() === keyword.toLowerCase() && d.tier === tier
    );
  },
}));
