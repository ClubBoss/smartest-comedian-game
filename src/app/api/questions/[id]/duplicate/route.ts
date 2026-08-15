import { randomUUID } from "node:crypto";
import { requireQuestionBankAdmin } from "@/lib/question-bank-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = requireQuestionBankAdmin(request);
  if (!auth.ok) return Response.json({ error: auth.error }, { status: auth.status });

  const { id } = await params;
  const supabase = getSupabaseAdmin();
  const { data: question, error } = await supabase
    .from("questions")
    .select("id, prompt, answer, answer_variants, explanation, host_notes, category, difficulty, source_label, source_url")
    .eq("id", id)
    .maybeSingle();
  if (error) {
    console.error("Question duplicate lookup failed", error);
    return Response.json({ error: "Could not load question." }, { status: 500 });
  }
  if (!question) return Response.json({ error: "Question not found." }, { status: 404 });

  const [hintsResult, assetsResult, tagsResult] = await Promise.all([
    supabase.from("question_hints").select("position, text").eq("question_id", id).order("position"),
    supabase.from("question_assets").select("position, storage_path, mime_type, alt_text, caption, width, height").eq("question_id", id).order("position"),
    supabase.from("question_tags").select("tag").eq("question_id", id),
  ]);
  if (hintsResult.error || assetsResult.error || tagsResult.error) {
    console.error("Question duplicate relations failed", hintsResult.error ?? assetsResult.error ?? tagsResult.error);
    return Response.json({ error: "Could not load question details." }, { status: 500 });
  }

  const duplicateId = randomUUID();
  const { data: savedId, error: saveError } = await supabase.rpc("save_question_atomic", {
    p_question_id: duplicateId,
    p_prompt: question.prompt,
    p_answer: question.answer,
    p_answer_variants: question.answer_variants ?? [],
    p_explanation: question.explanation,
    p_host_notes: question.host_notes,
    p_category: question.category,
    p_difficulty: question.difficulty,
    p_source_label: question.source_label,
    p_source_url: question.source_url,
    p_status: "draft",
    p_hints: (hintsResult.data ?? []).map((hint) => hint.text),
    p_tags: (tagsResult.data ?? []).map((tag) => tag.tag),
    p_assets: (assetsResult.data ?? []).map((asset) => ({
      asset_type: "image",
      storage_path: asset.storage_path,
      mime_type: asset.mime_type,
      alt_text: asset.alt_text,
      caption: asset.caption,
      width: asset.width,
      height: asset.height,
    })),
  });
  if (saveError) {
    console.error("Question duplicate save failed", saveError);
    return Response.json({ error: "Could not duplicate question." }, { status: 500 });
  }

  return Response.json({ id: savedId ?? duplicateId });
}
