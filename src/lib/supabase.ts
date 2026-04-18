import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://eqhuacksgeqywlvtyely.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVxaHVhY2tzZ2VxeXdsdnR5ZWx5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyNzY5MDgsImV4cCI6MjA4NTg1MjkwOH0.QRf3KEu9mUPKJRewV6I3LHReyYdxSDssoDg2b5vIOYI';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
