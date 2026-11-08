/**
 * Browser-side Supabase client used ONLY for subscribing to Realtime Broadcast
 * channels (`room-<code>`). All database reads and writes go through Next.js API routes.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

let browserClient: SupabaseClient | null | undefined;

export function getBrowserSupabase(): SupabaseClient | null {
  if (typeof window === 'undefined') return null;
  if (browserClient !== undefined) return browserClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !anonKey) {
    browserClient = null;
    return null;
  }

  browserClient = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    realtime: { params: { eventsPerSecond: 20 } },
  });
  return browserClient;
}
