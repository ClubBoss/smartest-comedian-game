import { randomUUID } from "node:crypto";
import { requireQuestionBankAdmin } from "@/lib/question-bank-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const IMAGE_TYPES = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
  ["image/gif", "gif"],
]);
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type AssetInput = {
  kind: "existing" | "new";
  storagePath?: string;
  mimeType?: string;
  uploadKey?: string;
  altText?: string;
  caption?: string;
  width?: number | null;
  height?: number | null;
};

type QuestionPayload = {
  id?: string;
  prompt?: string;
  answer?: string;
  answerVariants?: string[];
  explanation?: string;
  hostNotes?: string;
  category?: string;
  difficulty?: number | null;
  sourceLabel?: string;
  sourceUrl?: string;
  status?: "draft" | "ready" | "archived";
  hints?: string[];
  tags?: string[];
  assets?: AssetInput[];
};

function cleanStrings(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

async function signedPreview(storagePath: string): Promise<string | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.storage
    .from("question-images")
    .createSignedUrl(storagePath, 600);
  if (error) return null;
  return data.signedUrl;
}

export async function GET(request: Request) {
  const auth = requireQuestionBankAdmin(request);
  if (!auth.ok) return Response.json({ error: auth.error }, { status: auth.status });

  const supabase = getSupabaseAdmin();
  const { data: questions, error } = await supabase
    .from("questions")
    .select("id, prompt, answer, answer_variants, explanation, host_notes, category, difficulty, source_label, source_url, status, created_at, updated_at")
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("Question list failed", error);
    return Response.json({ error: "Could not load Question Bank." }, { status: 500 });
  }

  const ids = (questions ?? []).map((question) => question.id);
  if (ids.length === 0) return Response.json({ questions: [] });

  const [hintsResult, assetsResult, tagsResult] = await Promise.all([
    supabase.from("question_hints").select("question_id, position, text").in("question_id", ids).order("position"),
    supabase.from("question_assets").select("id, question_id, position, storage_path, mime_type, alt_text, caption, width, height").in("question_id", ids).order("position"),
    supabase.from("question_tags").select("question_id, tag").in("question_id", ids),
  ]);

  if (hintsResult.error || assetsResult.error || tagsResult.error) {
    console.error("Question relations failed", hintsResult.error ?? assetsResult.error ?? tagsResult.error);
    return Response.json({ error: "Could not load Question Bank details." }, { status: 500 });
  }

  const assetsWithUrls = await Promise.all(
    (assetsResult.data ?? []).map(async (asset) => ({
      ...asset,
      preview_url: await signedPreview(asset.storage_path),
    })),
  );

  const records = (questions ?? []).map((question) => ({
    id: question.id,
    prompt: question.prompt,
    answer: question.answer,
    answerVariants: question.answer_variants ?? [],
    explanation: question.explanation,
    hostNotes: question.host_notes,
    category: question.category,
    difficulty: question.difficulty,
    sourceLabel: question.source_label,
    sourceUrl: question.source_url,
    status: question.status,
    createdAt: question.created_at,
    updatedAt: question.updated_at,
    hints: (hintsResult.data ?? [])
      .filter((hint) => hint.question_id === question.id)
      .map((hint) => hint.text),
    tags: (tagsResult.data ?? [])
      .filter((tag) => tag.question_id === question.id)
      .map((tag) => tag.tag),
    assets: assetsWithUrls
      .filter((asset) => asset.question_id === question.id)
      .map((asset) => ({
        id: asset.id,
        storagePath: asset.storage_path,
        mimeType: asset.mime_type,
        altText: asset.alt_text,
        caption: asset.caption,
        width: asset.width,
        height: asset.height,
        previewUrl: asset.preview_url,
      })),
  }));

  return Response.json({ questions: records });
}

export async function POST(request: Request) {
  const auth = requireQuestionBankAdmin(request);
  if (!auth.ok) return Response.json({ error: auth.error }, { status: auth.status });

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return Response.json({ error: "Invalid multipart request." }, { status: 400 });
  }

  const rawPayload = form.get("payload");
  if (typeof rawPayload !== "string") {
    return Response.json({ error: "Question payload is required." }, { status: 400 });
  }

  let payload: QuestionPayload;
  try {
    payload = JSON.parse(rawPayload) as QuestionPayload;
  } catch {
    return Response.json({ error: "Question payload is invalid JSON." }, { status: 400 });
  }

  const questionId = payload.id ?? randomUUID();
  if (!UUID_PATTERN.test(questionId)) {
    return Response.json({ error: "Invalid question id." }, { status: 400 });
  }

  const answer = typeof payload.answer === "string" ? payload.answer.trim() : "";
  const prompt = typeof payload.prompt === "string" ? payload.prompt.trim() : "";
  const status = payload.status ?? "draft";
  const difficulty = payload.difficulty == null ? null : Number(payload.difficulty);
  const assets = Array.isArray(payload.assets) ? payload.assets : [];

  if (!answer) return Response.json({ error: "Answer is required." }, { status: 400 });
  if (!["draft", "ready", "archived"].includes(status)) {
    return Response.json({ error: "Invalid question status." }, { status: 400 });
  }
  if (difficulty !== null && (!Number.isInteger(difficulty) || difficulty < 1 || difficulty > 5)) {
    return Response.json({ error: "Difficulty must be 1 through 5." }, { status: 400 });
  }
  if (!prompt && assets.length === 0) {
    return Response.json({ error: "Add question text or at least one image." }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { data: oldAssets, error: oldAssetError } = await supabase
    .from("question_assets")
    .select("storage_path, mime_type, alt_text, caption, width, height")
    .eq("question_id", questionId)
    .order("position");
  if (oldAssetError) {
    console.error("Existing question assets failed", oldAssetError);
    return Response.json({ error: "Could not prepare question images." }, { status: 500 });
  }

  const oldPaths = new Set((oldAssets ?? []).map((asset) => asset.storage_path));
  const savedAssets: Array<{
    asset_type: "image";
    storage_path: string;
    mime_type: string;
    alt_text: string | null;
    caption: string | null;
    width: number | null;
    height: number | null;
  }> = [];
  const newlyUploaded: string[] = [];

  for (const asset of assets) {
    const altText = typeof asset.altText === "string" ? asset.altText.slice(0, 300) : "";
    const caption = typeof asset.caption === "string" ? asset.caption.slice(0, 500) : "";
    const width = Number.isInteger(asset.width) && Number(asset.width) > 0 ? Number(asset.width) : null;
    const height = Number.isInteger(asset.height) && Number(asset.height) > 0 ? Number(asset.height) : null;

    if (asset.kind === "existing") {
      if (!asset.storagePath || !oldPaths.has(asset.storagePath)) {
        await supabase.storage.from("question-images").remove(newlyUploaded);
        return Response.json({ error: "Existing image reference is invalid." }, { status: 400 });
      }
      const prior = (oldAssets ?? []).find((item) => item.storage_path === asset.storagePath);
      savedAssets.push({
        asset_type: "image",
        storage_path: asset.storagePath,
        mime_type: prior?.mime_type ?? asset.mimeType ?? "image/jpeg",
        alt_text: altText || null,
        caption: caption || null,
        width: width ?? prior?.width ?? null,
        height: height ?? prior?.height ?? null,
      });
      continue;
    }

    if (asset.kind !== "new" || !asset.uploadKey) {
      await supabase.storage.from("question-images").remove(newlyUploaded);
      return Response.json({ error: "New image metadata is invalid." }, { status: 400 });
    }

    const file = form.get(asset.uploadKey);
    if (!(file instanceof File)) {
      await supabase.storage.from("question-images").remove(newlyUploaded);
      return Response.json({ error: "A selected image is missing from upload." }, { status: 400 });
    }
    const extension = IMAGE_TYPES.get(file.type);
    if (!extension || file.size <= 0 || file.size > MAX_IMAGE_BYTES) {
      await supabase.storage.from("question-images").remove(newlyUploaded);
      return Response.json({ error: "Images must be JPG, PNG, WEBP or GIF and no larger than 5 MB." }, { status: 400 });
    }

    const storagePath = `${questionId}/${randomUUID()}.${extension}`;
    const { error: uploadError } = await supabase.storage
      .from("question-images")
      .upload(storagePath, Buffer.from(await file.arrayBuffer()), {
        contentType: file.type,
        upsert: false,
      });
    if (uploadError) {
      await supabase.storage.from("question-images").remove(newlyUploaded);
      console.error("Question image upload failed", uploadError);
      return Response.json({ error: "Could not upload question image." }, { status: 500 });
    }
    newlyUploaded.push(storagePath);
    savedAssets.push({
      asset_type: "image",
      storage_path: storagePath,
      mime_type: file.type,
      alt_text: altText || null,
      caption: caption || null,
      width,
      height,
    });
  }

  const { data: savedId, error: saveError } = await supabase.rpc("save_question_atomic", {
    p_question_id: questionId,
    p_prompt: prompt || null,
    p_answer: answer,
    p_answer_variants: cleanStrings(payload.answerVariants),
    p_explanation: typeof payload.explanation === "string" ? payload.explanation : null,
    p_host_notes: typeof payload.hostNotes === "string" ? payload.hostNotes : null,
    p_category: typeof payload.category === "string" ? payload.category : null,
    p_difficulty: difficulty,
    p_source_label: typeof payload.sourceLabel === "string" ? payload.sourceLabel : null,
    p_source_url: typeof payload.sourceUrl === "string" ? payload.sourceUrl : null,
    p_status: status,
    p_hints: cleanStrings(payload.hints),
    p_tags: cleanStrings(payload.tags),
    p_assets: savedAssets,
  });

  if (saveError) {
    if (newlyUploaded.length > 0) await supabase.storage.from("question-images").remove(newlyUploaded);
    console.error("Question save failed", saveError);
    const known = saveError.message.match(/ERR_[A-Z_]+/)?.[0];
    if (known === "ERR_STIMULUS_REQUIRED") {
      return Response.json({ error: "Add question text or at least one image." }, { status: 400 });
    }
    return Response.json({ error: "Could not save question." }, { status: 500 });
  }

  const retainedPaths = new Set(savedAssets.map((asset) => asset.storage_path));
  const removedPaths = [...oldPaths].filter((path) => !retainedPaths.has(path));
  if (removedPaths.length > 0) {
    const { error: removeError } = await supabase.storage.from("question-images").remove(removedPaths);
    if (removeError) console.error("Old question image cleanup failed", removeError);
  }

  return Response.json({ id: savedId ?? questionId });
}
