import { useEffect, useState } from "react";
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
 


/**
 * Display name of the signed-in teammate, derived from their login email.
 * contact@ / info@ style inboxes fall back to the provided default (the
 * workspace sender name); personal addresses use the capitalized local part
 * (marvin@luuno.ai → "Marvin"). Offline mode returns the default.
 */
export function useSessionName(fallback: string): string {
  const [name, setName] = useState(fallback);
  useEffect(() => {
    if (!supabaseEnabled || !supabase) return;
    let cancelled = false;
    supabase.auth.getUser().then(({ data }) => {
      if (cancelled) return;
      const email = data.user?.email ?? "";
      const local = email.split("@")[0]?.toLowerCase() ?? "";
      if (!local || ["contact", "info", "hello", "admin", "team"].includes(local)) {
        setName(fallback);
      } else {
        setName(local.charAt(0).toUpperCase() + local.slice(1));
      }
    });
    return () => {
      cancelled = true;
    };
  }, [fallback]);
  return name;
}
