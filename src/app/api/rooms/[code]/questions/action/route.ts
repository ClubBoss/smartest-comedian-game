import { requireHostForRoom } from "@/lib/room-auth";
import { broadcastRoomRefresh } from "@/lib/room-events";

type ActionBody = {
  action?: unknown;
  questionId?: unknown;
  queueItemId?: unknown;
  direction?: unknown;
};

export async function POST(
  request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code: rawCode } = await params;
  const auth = await requireHostForRoom(request, rawCode);
  if ("error" in auth) return Response.json({ error: auth.error }, { status: auth.status });

  let body: ActionBody;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const action = typeof body.action === "string" ? body.action : "";
  let data: unknown = null;
  let error: { message: string } | null = null;

  if (action === "queue") {
    if (typeof body.questionId !== "string") return Response.json({ error: "Question is required." }, { status: 400 });
    ({ data, error } = await auth.supabase.rpc("queue_question_atomic", {
      p_room_id: auth.room.id,
      p_question_id: body.questionId,
    }));
  } else if (action === "move") {
    if (typeof body.queueItemId !== "string" || ![-1, 1].includes(Number(body.direction))) {
      return Response.json({ error: "Queue item and direction are required." }, { status: 400 });
    }
    ({ data, error } = await auth.supabase.rpc("move_queue_item_atomic", {
      p_room_id: auth.room.id,
      p_item_id: body.queueItemId,
      p_direction: Number(body.direction),
    }));
  } else if (action === "skip") {
    if (typeof body.queueItemId !== "string") return Response.json({ error: "Queue item is required." }, { status: 400 });
    ({ data, error } = await auth.supabase.rpc("skip_queue_item_atomic", {
      p_room_id: auth.room.id,
      p_item_id: body.queueItemId,
    }));
  } else if (action === "start") {
    if (typeof body.questionId !== "string") return Response.json({ error: "Question is required." }, { status: 400 });
    ({ data, error } = await auth.supabase.rpc("start_question_atomic", {
      p_room_id: auth.room.id,
      p_question_id: body.questionId,
      p_queue_item_id: typeof body.queueItemId === "string" ? body.queueItemId : null,
    }));
  } else if (action === "start-next") {
    ({ data, error } = await auth.supabase.rpc("start_next_queued_question_atomic", {
      p_room_id: auth.room.id,
    }));
  } else if (action === "reveal-stimulus") {
    ({ data, error } = await auth.supabase.rpc("reveal_question_stimulus_atomic", {
      p_room_id: auth.room.id,
    }));
  } else if (action === "reveal-hint") {
    ({ data, error } = await auth.supabase.rpc("reveal_next_hint_atomic", {
      p_room_id: auth.room.id,
    }));
  } else if (action === "reveal-answer") {
    ({ data, error } = await auth.supabase.rpc("reveal_question_answer_atomic", {
      p_room_id: auth.room.id,
    }));
  } else if (action === "finish") {
    ({ data, error } = await auth.supabase.rpc("finish_question_atomic", {
      p_room_id: auth.room.id,
    }));
  } else {
    return Response.json({ error: "Unknown live question action." }, { status: 400 });
  }

  if (error) {
    const known = error.message.match(/ERR_[A-Z_]+/)?.[0];
    const conflicts = new Set([
      "ERR_QUESTION_ACTIVE",
      "ERR_QUESTION_NOT_READY",
      "ERR_QUEUE_ITEM_NOT_FOUND",
      "ERR_QUEUE_EMPTY",
      "ERR_NO_ACTIVE_QUESTION",
      "ERR_STIMULUS_HIDDEN",
      "ERR_NO_MORE_HINTS",
    ]);
    if (known && conflicts.has(known)) {
      return Response.json({ error: known }, { status: 409 });
    }
    console.error("Live question action failed", action, error);
    return Response.json({ error: "Live question action failed." }, { status: 500 });
  }

  await broadcastRoomRefresh(auth.room.code);
  return Response.json({ ok: true, data });
}
