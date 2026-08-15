import { isHostReactionKey } from "@/domain/reactions";
import { requireHostForRoom } from "@/lib/room-auth";
import { broadcastRoomMeta } from "@/lib/room-events";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code: rawCode } = await params;
  const auth = await requireHostForRoom(request, rawCode);
  if ("error" in auth) return Response.json({ error: auth.error }, { status: auth.status });

  let body: { key?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const key = typeof body.key === "string" ? body.key : "";
  if (!isHostReactionKey(key)) {
    return Response.json({ error: "Unknown reaction." }, { status: 400 });
  }

  await broadcastRoomMeta(auth.room.code, "host_reaction", { key });
  return Response.json({ ok: true });
}
