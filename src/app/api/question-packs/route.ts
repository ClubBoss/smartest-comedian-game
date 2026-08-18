import { randomUUID } from "node:crypto";
import { requireQuestionBankAdmin } from "@/lib/question-bank-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ROLES = new Set(["regular", "qualifier_super", "team", "last", "double_or_nothing", "tiebreak"]);

type PackItemInput = { questionId: string; role: string };

async function loadPacks() {
  const supabase = getSupabaseAdmin();
  const [{ data: packs, error: packsError }, { data: items, error: itemsError }, { data: questions, error: questionsError }] = await Promise.all([
    supabase.from("question_packs").select("id, name, description, created_at, updated_at").order("updated_at", { ascending: false }),
    supabase.from("question_pack_items").select("pack_id, question_id, position, question_role, correct_points, wrong_points").order("position"),
    supabase.from("questions").select("id, prompt, category, status, updated_at").order("updated_at", { ascending: false }),
  ]);
  if (packsError || itemsError || questionsError) throw packsError ?? itemsError ?? questionsError;

  const allQuestions = questions ?? [];
  const publicQuestionRefs = allQuestions.map((question) => ({
    id: question.id,
    prompt: question.prompt,
    category: question.category,
    status: question.status,
  }));
  const questionMap = new Map(publicQuestionRefs.map((question) => [question.id, question]));

  return {
    packs: (packs ?? []).map((pack) => {
      const packItems = (items ?? []).filter((item) => item.pack_id === pack.id).sort((a, b) => a.position - b.position);
      return {
        id: pack.id,
        name: pack.name,
        description: pack.description,
        questionIds: packItems.map((item) => item.question_id),
        items: packItems.map((item) => ({
          questionId: item.question_id,
          role: item.question_role ?? "regular",
          correctPoints: item.correct_points,
          wrongPoints: item.wrong_points,
          question: questionMap.get(item.question_id) ?? { id: item.question_id, prompt: "Unavailable question", category: null, status: "unavailable" },
        })),
        questions: packItems.map((item) => questionMap.get(item.question_id) ?? { id: item.question_id, prompt: "Unavailable question", category: null, status: "unavailable" }),
      };
    }),
    questions: publicQuestionRefs,
    readyQuestions: publicQuestionRefs.filter((question) => question.status === "ready"),
  };
}

export async function GET(request: Request) {
  const auth = requireQuestionBankAdmin(request);
  if (!auth.ok) return Response.json({ error: auth.error }, { status: auth.status });
  try {
    return Response.json(await loadPacks());
  } catch (error) {
    console.error("Question packs load failed", error);
    return Response.json({ error: "Could not load question packs." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = requireQuestionBankAdmin(request);
  if (!auth.ok) return Response.json({ error: auth.error }, { status: auth.status });

  let body: { id?: unknown; name?: unknown; description?: unknown; questionIds?: unknown; items?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (body.id !== undefined && (typeof body.id !== "string" || !UUID_PATTERN.test(body.id))) {
    return Response.json({ error: "Invalid pack id." }, { status: 400 });
  }
  const id = typeof body.id === "string" ? body.id : randomUUID();
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const description = typeof body.description === "string" ? body.description.trim() : "";

  let items: PackItemInput[] = [];
  if (Array.isArray(body.items)) {
    items = body.items.flatMap((value) => {
      if (!value || typeof value !== "object") return [];
      const raw = value as { questionId?: unknown; role?: unknown };
      if (typeof raw.questionId !== "string" || !UUID_PATTERN.test(raw.questionId)) return [];
      const role = typeof raw.role === "string" && ROLES.has(raw.role) ? raw.role : "regular";
      return [{ questionId: raw.questionId, role }];
    });
  } else if (Array.isArray(body.questionIds)) {
    items = body.questionIds.flatMap((value) => typeof value === "string" && UUID_PATTERN.test(value)
      ? [{ questionId: value, role: "regular" }]
      : []);
  }

  if (!name) return Response.json({ error: "Pack name is required." }, { status: 400 });
  if (items.length < 1) return Response.json({ error: "Select at least one Ready question." }, { status: 400 });
  if (items.length > 100) return Response.json({ error: "A pack can contain at most 100 questions." }, { status: 400 });
  if (new Set(items.map((item) => item.questionId)).size !== items.length) {
    return Response.json({ error: "A question can appear only once in a pack." }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.rpc("save_question_pack_with_roles_atomic", {
    p_pack_id: id,
    p_name: name,
    p_description: description || null,
    p_items: items,
  });
  if (error) {
    const known = error.message.match(/ERR_[A-Z_]+/)?.[0];
    if (known) return Response.json({ error: known }, { status: 409 });
    console.error("Question pack save failed", error);
    return Response.json({ error: "Could not save question pack." }, { status: 500 });
  }
  return Response.json({ id: data ?? id });
}
