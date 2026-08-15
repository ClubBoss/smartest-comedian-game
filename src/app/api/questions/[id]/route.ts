import { requireQuestionBankAdmin } from "@/lib/question-bank-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = requireQuestionBankAdmin(request);
  if (!auth.ok) return Response.json({ error: auth.error }, { status: auth.status });

  const { id } = await params;
  const supabase = getSupabaseAdmin();
  const { data: question, error: lookupError } = await supabase
    .from("questions")
    .select("id, status")
    .eq("id", id)
    .maybeSingle();

  if (lookupError) {
    console.error("Question delete lookup failed", lookupError);
    return Response.json({ error: "Could not load question." }, { status: 500 });
  }
  if (!question) return Response.json({ error: "Question not found." }, { status: 404 });
  if (question.status !== "archived") {
    return Response.json({ error: "Archive the question before permanently deleting it." }, { status: 409 });
  }

  const [packRefs, queuedRefs] = await Promise.all([
    supabase
      .from("question_pack_items")
      .select("pack_id", { count: "exact", head: true })
      .eq("question_id", id),
    supabase
      .from("room_question_queue")
      .select("id", { count: "exact", head: true })
      .eq("question_id", id)
      .eq("state", "queued"),
  ]);

  if (packRefs.error || queuedRefs.error) {
    console.error("Question delete reference check failed", packRefs.error ?? queuedRefs.error);
    return Response.json({ error: "Could not verify whether the question is still in use." }, { status: 500 });
  }
  if ((packRefs.count ?? 0) > 0) {
    return Response.json({ error: "Remove this question from saved Question Packs before deleting it." }, { status: 409 });
  }
  if ((queuedRefs.count ?? 0) > 0) {
    return Response.json({ error: "Remove or finish this question in room queues before deleting it." }, { status: 409 });
  }

  const { error: deleteError } = await supabase.from("questions").delete().eq("id", id);
  if (deleteError) {
    console.error("Question delete failed", deleteError);
    const conflict = deleteError.code === "23503";
    return Response.json(
      { error: conflict ? "This question is still referenced elsewhere and cannot be deleted yet." : "Could not delete question." },
      { status: conflict ? 409 : 500 },
    );
  }

  // Database relations cascade or detach safely. Storage objects are retained:
  // immutable played-question snapshots may still reference their paths.
  return Response.json({ deleted: true });
}
