import { requireHostForRoom } from "@/lib/room-auth";
import { broadcastRoomRefresh } from "@/lib/room-events";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code: rawCode } = await params;
  const auth = await requireHostForRoom(request, rawCode);
  if ("error" in auth) return Response.json({ error: auth.error }, { status: auth.status });

  const [{ data: packs, error: packsError }, { data: items, error: itemsError }] = await Promise.all([
    auth.supabase.from("question_packs").select("id, name, description").order("updated_at", { ascending: false }),
    auth.supabase.from("question_pack_items").select("pack_id, question_id, position, question_role").order("position"),
  ]);
  if (packsError || itemsError) {
    console.error("Host question packs load failed", packsError ?? itemsError);
    return Response.json({ error: "Could not load question packs." }, { status: 500 });
  }

  return Response.json({
    packs: (packs ?? []).map((pack) => {
      const packItems = (items ?? []).filter((item) => item.pack_id === pack.id);
      return {
        ...pack,
        count: packItems.length,
        hasSpecialQuestions: packItems.some((item) => item.question_role !== "regular"),
      };
    }),
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code: rawCode } = await params;
  const auth = await requireHostForRoom(request, rawCode);
  if ("error" in auth) return Response.json({ error: auth.error }, { status: auth.status });

  let body: { packId?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  if (typeof body.packId !== "string") return Response.json({ error: "Pack is required." }, { status: 400 });

  const { data: pack, error: packError } = await auth.supabase
    .from("question_packs")
    .select("id, name")
    .eq("id", body.packId)
    .maybeSingle();
  if (packError) {
    console.error("Pack lookup failed", packError);
    return Response.json({ error: "Could not load question pack." }, { status: 500 });
  }
  if (!pack) return Response.json({ error: "Pack not found." }, { status: 404 });

  const { data, error } = await auth.supabase.rpc("queue_question_pack_with_roles_atomic", {
    p_room_id: auth.room.id,
    p_pack_id: pack.id,
  });
  if (error) {
    const known = error.message.match(/ERR_[A-Z_]+/)?.[0];
    if (known) return Response.json({ error: known }, { status: 409 });
    console.error("Queue question pack failed", error);
    return Response.json({ error: "Could not load question pack." }, { status: 500 });
  }

  await broadcastRoomRefresh(auth.room.code);
  return Response.json({ ok: true, count: Number(data ?? 0), packName: pack.name });
}
