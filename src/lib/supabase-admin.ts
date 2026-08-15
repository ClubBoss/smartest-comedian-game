import { createClient } from "@supabase/supabase-js";
import { readSupabaseServerEnv } from "./env";

let adminClient: ReturnType<typeof createClient> | undefined;

export function getSupabaseAdmin() {
  if (!adminClient) {
    const env = readSupabaseServerEnv();
    adminClient = createClient(env.url, env.serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    });
  }

  return adminClient;
}
