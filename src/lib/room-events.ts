import { getSupabaseAdmin } from "./supabase-admin";

export async function broadcastRoomRefresh(code: string): Promise<void> {
  try {
    const supabase = getSupabaseAdmin();
    const channel = supabase.channel(`room:${code}`);
    await channel.httpSend("state_changed", { code });
  } catch (error) {
    console.warn("Realtime refresh broadcast failed", error);
  }
}
