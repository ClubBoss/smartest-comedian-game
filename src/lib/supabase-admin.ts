import { createClient } from "@supabase/supabase-js";
import { readSupabaseServerEnv } from "./env";

export function getSupabaseAdmin() {
  const env = readSupabaseServerEnv();
  return createClient(env.url, env.adminKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
}
