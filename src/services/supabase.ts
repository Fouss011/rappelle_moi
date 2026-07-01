import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ldtwfftuqzwljdxiklbx.supabase.co';

const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxkdHdmZnR1cXp3bGpkeGlrbGJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI0OTgxNjEsImV4cCI6MjA5ODA3NDE2MX0.SVF-F4y4rvGF736huKpUX2eqYcRiKDhijDCZCie_UP8';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);