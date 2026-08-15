import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  isSupabaseConfigured,
  supabasePublishableKey,
  supabaseUrl,
} from "./config";

/**
 * The single Supabase client for the whole app. Null in preview builds that
 * carry no backend coordinates; every auth helper refuses politely instead of
 * throwing an opaque runtime error.
 */
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabasePublishableKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        // Provider (OAuth) returns arrive as ?code=; the client exchanges it
        // for a session during initialisation.
        detectSessionInUrl: true,
        flowType: "pkce",
      },
    })
  : null;

export function requireAuthClient(): SupabaseClient {
  if (!supabase) throw new Error("Supabase is not configured");
  return supabase;
}
