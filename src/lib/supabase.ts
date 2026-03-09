import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://eqhuacksgeqywlvtyely.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_n6zRl0hcxM3RxICC5yWGAA_Sv0HWlha';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
