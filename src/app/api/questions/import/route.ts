import { randomUUID } from "node:crypto";
import { requireQuestionBankAdmin } from "@/lib/question-bank-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

type ImportQuestion = {
  prompt?: unknown;
  answer?: unknown;
  answerVariants?: unknown;
  explanation?: unknown;
  hostNotes?: unknown;
  category?: unknown;
  difficulty?: unknown;
  sourceLabel?: unknown;
  sourceUrl?: unknown;
  status?: unknown;
  hints?: unknown;
  tags?: unknown;
};

type NormalizedQuestion = {
  id: string;
  prompt: string;
  answer: string;
  answerVariants: string[];
  explanation: string | null;
  hostNotes: string | null;
  category: string | null;
  difficulty: number | null;
  sourceLabel: string | null;
  sourceUrl: string | null;
  status: "draft" | "ready" | "archived";
  hints: string[];
  tags: string[];
};

function stringOrNull(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const clean = value.trim();
  return clean || null;
}

function strings(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean);
}

function normalize(item: ImportQuestion, index: number): NormalizedQuestion {
  const prompt = typeof item.prompt === "string" ? item.prompt.trim() : "";
  const answer = typeof item.answer === "string" ? item.answer.trim() : "";
  if (!prompt) throw new Error(`Row ${index + 1}: prompt is required for bulk import.`);
  if (!answer) throw new Error(`Row ${index + 1}: answer is required.`);

  let difficulty: number | null = null;
  if (item.difficulty !== undefined && item.difficulty !== null && item.difficulty !== "") {
    difficulty = Number(item.difficulty);
    if (!Number.isInteger(difficulty) || difficulty < 1 || difficulty > 5) {
      throw new Error(`Row ${index + 1}: difficulty must be 1 through 5.`);
    }
  }

  const status = item.status ?? "draft";
  if (status !== "draft" && status !== "ready" && status !== "archived") {
    throw new Error(`Row ${index + 1}: invalid status.`);
  }

  return {
    id: randomUUID(),
    prompt,
    answer,
    answerVariants: strings(item.answerVariants),
    explanation: stringOrNull(item.explanation),
    hostNotes: stringOrNull(item.hostNotes),
    category: stringOrNull(item.category),
    difficulty,
    sourceLabel: stringOrNull(item.sourceLabel),
    sourceUrl: stringOrNull(item.sourceUrl),
    status,
    hints: strings(item.hints),
    tags: strings(item.tags),
  };
}

export async function POST(request: Request) {
  const auth = requireQuestionBankAdmin(request);
  if (!auth.ok) return Response.json({ error: auth.error }, { status: auth.status });

  let body: { questions?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  if (!Array.isArray(body.questions) || body.questions.length === 0) {
    return Response.json({ error: "Provide at least one question." }, { status: 400 });
  }
  if (body.questions.length > 250) {
    return Response.json({ error: "Import is limited to 250 questions at a time." }, { status: 400 });
  }

  let normalized: NormalizedQuestion[];
  try {
    normalized = body.questions.map((item, index) => normalize((item ?? {}) as ImportQuestion, index));
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Invalid import data." }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const ids: string[] = [];
  for (const question of normalized) {
    const { data: savedId, error } = await supabase.rpc("save_question_atomic", {
      p_question_id: question.id,
      p_prompt: question.prompt,
      p_answer: question.answer,
      p_answer_variants: question.answerVariants,
      p_explanation: question.explanation,
      p_host_notes: question.hostNotes,
      p_category: question.category,
      p_difficulty: question.difficulty,
      p_source_label: question.sourceLabel,
      p_source_url: question.sourceUrl,
      p_status: question.status,
      p_hints: question.hints,
      p_tags: question.tags,
      p_assets: [],
    });
    if (error) {
      console.error("Bulk question import failed", error);
      return Response.json({ error: `Import failed after ${ids.length} questions. Retry the remaining rows.` }, { status: 500 });
    }
    ids.push(savedId ?? question.id);
  }

  return Response.json({ count: ids.length, ids });
}
