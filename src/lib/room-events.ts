import { getSupabaseAdmin } from "./supabase-admin";

async function broadcast(code: string, channelName: string, event: string, payload: object): Promise<void> {
  try {
    const supabase = getSupabaseAdmin();
    const channel = supabase.channel(channelName);
    await channel.httpSend(event, payload);
  } catch (error) {
    console.warn(`Realtime ${event} broadcast failed`, error);
  }
}

export async function broadcastRoomRefresh(code: string): Promise<void> {
  await broadcast(code, `room:${code}`, "state_changed", { code });
}

export async function broadcastRoomMeta(code: string, event: string, payload: object): Promise<void> {
  await broadcast(code, `room-meta:${code}`, event, payload);
}
