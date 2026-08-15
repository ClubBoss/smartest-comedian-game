import { assertRoomCapacity } from "@/domain/room";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { createOpaqueToken, createRoomCode, hashToken } from "@/lib/tokens";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const capacityValue = Number((body as { capacity?: unknown }).capacity);
  try {
    assertRoomCapacity(capacityValue);
  } catch {
    return Response.json({ error: "Capacity must be an integer from 2 to 10." }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const hostToken = createOpaqueToken();
  const hostSecretHash = hashToken(hostToken);

  for (let attempt = 0; attempt < 6; attempt += 1) {
    const code = createRoomCode();
    const { data, error } = await supabase
      .from("rooms")
      .insert({ code, host_secret_hash: hostSecretHash, capacity: capacityValue })
      .select("code, capacity, phase")
      .single();

    if (!error && data) {
      return Response.json({
        code: data.code,
        capacity: data.capacity,
        phase: data.phase,
        hostToken,
      });
    }

    if (error?.code !== "23505") {
      console.error("Room creation failed", error);
      return Response.json({ error: "Could not create room." }, { status: 500 });
    }
  }

  return Response.json({ error: "Could not allocate a room code." }, { status: 503 });
}
