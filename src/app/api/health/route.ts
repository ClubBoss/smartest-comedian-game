import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

export async function GET() {
  const buildSha = process.env.APP_BUILD_SHA ?? "unknown";

  try {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase
      .from("rooms")
      .select("id", { head: true, count: "exact" })
      .limit(1);

    if (error) throw error;

    return Response.json(
      { ok: true, database: "ok", buildSha },
      { headers: { "cache-control": "no-store" } },
    );
  } catch {
    return Response.json(
      { ok: false, database: "error", buildSha },
      {
        status: 503,
        headers: { "cache-control": "no-store" },
      },
    );
  }
}
