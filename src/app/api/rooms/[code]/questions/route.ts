import { requireHostForRoom } from "@/lib/room-auth";

type SnapshotAsset = {
  storage_path?: string;
  mime_type?: string;
  alt_text?: string | null;
  caption?: string | null;
  width?: number | null;
  height?: number | null;
};

async function signQuestionAsset(
  supabase: Awaited<ReturnType<typeof requireHostForRoom>> extends { supabase: infer T } ? T : never,
  asset: SnapshotAsset,
) {
  if (!asset.storage_path) return { ...asset, previewUrl: null };
  const { data } = await supabase.storage
    .from("question-images")
    .createSignedUrl(asset.storage_path, 600);
  return {
    storagePath: asset.storage_path,
    mimeType: asset.mime_type ?? null,
    altText: asset.alt_text ?? null,
    caption: asset.caption ?? null,
    width: asset.width ?? null,
    height: asset.height ?? null,
    previewUrl: data?.signedUrl ?? null,
  };
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code: rawCode } = await params;
  const auth = await requireHostForRoom(request, rawCode);
  if ("error" in auth) return Response.json({ error: auth.error }, { status: auth.status });

  const { data: room, error: roomError } = await auth.supabase
    .from("rooms")
    .select("id, current_question_session_id")
    .eq("id", auth.room.id)
    .single();
  if (roomError) {
    console.error("Live question room lookup failed", roomError);
    return Response.json({ error: "Could not load live question state." }, { status: 500 });
  }

  const [{ data: readyQuestions, error: readyError }, { data: queueRows, error: queueError }] = await Promise.all([
    auth.supabase
      .from("questions")
      .select("id, prompt, category, difficulty, updated_at")
      .eq("status", "ready")
      .order("updated_at", { ascending: false }),
    auth.supabase
      .from("room_question_queue")
      .select("id, question_id, position, state")
      .eq("room_id", auth.room.id)
      .order("position", { ascending: true }),
  ]);

  if (readyError || queueError) {
    console.error("Live question catalog lookup failed", readyError ?? queueError);
    return Response.json({ error: "Could not load question queue." }, { status: 500 });
  }

  const ready = readyQuestions ?? [];
  const queueQuestionIds = (queueRows ?? [])
    .map((item) => item.question_id)
    .filter((value): value is string => Boolean(value));
  let queueQuestionMeta: Array<{ id: string; prompt: string | null; category: string | null }> = [];
  if (queueQuestionIds.length > 0) {
    const { data, error } = await auth.supabase
      .from("questions")
      .select("id, prompt, category")
      .in("id", queueQuestionIds);
    if (error) {
      console.error("Queue question metadata failed", error);
      return Response.json({ error: "Could not load queued question details." }, { status: 500 });
    }
    queueQuestionMeta = data ?? [];
  }

  let current = null;
  if (room.current_question_session_id) {
    const { data: session, error: sessionError } = await auth.supabase
      .from("question_sessions")
      .select("id, source_question_id, queue_item_id, prompt_snapshot, answer_snapshot, answer_variants_snapshot, explanation_snapshot, host_notes_snapshot, hints_snapshot, assets_snapshot, stimulus_revealed, revealed_hint_count, answer_revealed, started_at, ended_at")
      .eq("id", room.current_question_session_id)
      .maybeSingle();

    if (sessionError) {
      console.error("Private live question lookup failed", sessionError);
      return Response.json({ error: "Could not load current question." }, { status: 500 });
    }

    if (session && !session.ended_at) {
      const rawAssets = Array.isArray(session.assets_snapshot)
        ? (session.assets_snapshot as SnapshotAsset[])
        : [];
      current = {
        sessionId: session.id,
        sourceQuestionId: session.source_question_id,
        queueItemId: session.queue_item_id,
        prompt: session.prompt_snapshot,
        answer: session.answer_snapshot,
        answerVariants: Array.isArray(session.answer_variants_snapshot) ? session.answer_variants_snapshot : [],
        explanation: session.explanation_snapshot,
        hostNotes: session.host_notes_snapshot,
        hints: Array.isArray(session.hints_snapshot) ? session.hints_snapshot : [],
        assets: await Promise.all(rawAssets.map((asset) => signQuestionAsset(auth.supabase, asset))),
        stimulusRevealed: session.stimulus_revealed,
        revealedHintCount: session.revealed_hint_count,
        answerRevealed: session.answer_revealed,
        startedAt: session.started_at,
      };
    }
  }

  return Response.json({
    readyQuestions: ready.map((question) => ({
      id: question.id,
      prompt: question.prompt,
      category: question.category,
      difficulty: question.difficulty,
    })),
    queue: (queueRows ?? []).map((item) => {
      const meta = queueQuestionMeta.find((question) => question.id === item.question_id);
      return {
        id: item.id,
        questionId: item.question_id,
        position: item.position,
        state: item.state,
        prompt: meta?.prompt ?? "Unavailable question",
        category: meta?.category ?? null,
      };
    }),
    current,
  });
}
