import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Shared-workspace Supabase client.
 *
 * Env vars (set in .env locally and in Vercel project settings):
 *   VITE_SUPABASE_URL
 *   VITE_SUPABASE_ANON_KEY
 *
 * When the env vars are missing the app runs exactly as before — pure
 * localStorage, no login screen. This keeps the Lovable preview working.
 */
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabaseEnabled = Boolean(url && anonKey);

export const supabase: SupabaseClient | null = supabaseEnabled
  ? createClient(url!, anonKey!)
  : null;
