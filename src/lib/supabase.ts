
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
 
/**
 * Shared-workspace Supabase client.
 *
 * Env vars (set in .env locally and in Vercel project settings):
 *   VITE_SUPABASE_URL       e.g. https://xxxx.supabase.co
 *   VITE_SUPABASE_ANON_KEY  the anon public key
 *
 * Missing OR malformed values never crash the app: it falls back to
 * localStorage-only mode (no login screen) and logs why.
 */
const rawUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim();
const rawKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim();
 
function buildClient(): SupabaseClient | null {
  if (!rawUrl || !rawKey) return null;
  try {
    // Validates early so a swapped/typo'd value degrades instead of throwing
    // at module load and taking down every route.
    new URL(rawUrl);
    return createClient(rawUrl, rawKey);
  } catch (error) {
    console.error(
      "[luuno] VITE_SUPABASE_URL is not a valid URL — running in offline mode.",
      error,
    );
    return null;
  }
}
 
export const supabase: SupabaseClient | null = buildClient();
export const supabaseEnabled = supabase !== null;
 
