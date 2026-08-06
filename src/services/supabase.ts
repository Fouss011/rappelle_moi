import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  createClient,
  processLock,
} from '@supabase/supabase-js';

import {
  AppState,
  Platform,
} from 'react-native';

const supabaseUrl =
  'https://ldtwfftuqzwljdxiklbx.supabase.co';

const supabaseAnonKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxkdHdmZnR1cXp3bGpkeGlrbGJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI0OTgxNjEsImV4cCI6MjA5ODA3NDE2MX0.SVF-F4y4rvGF736huKpUX2eqYcRiKDhijDCZCie_UP8';

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      ...(Platform.OS !== 'web'
        ? {
            storage: AsyncStorage,
          }
        : {}),

      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
      lock: processLock,
    },
  }
);

/**
 * Garde le rafraîchissement de session actif
 * lorsque Daya revient au premier plan.
 *
 * Cet écouteur doit être enregistré une seule fois,
 * donc ce fichier est le bon emplacement.
 */
if (Platform.OS !== 'web') {
  AppState.addEventListener(
    'change',
    (state) => {
      if (state === 'active') {
        supabase.auth.startAutoRefresh();
      } else {
        supabase.auth.stopAutoRefresh();
      }
    }
  );
}