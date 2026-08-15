import { describe, expect, it } from "vitest";
import { readSupabasePublicEnv } from "./env";

describe("Supabase environment contract", () => {
  it("accepts a valid public configuration", () => {
    expect(
      readSupabasePublicEnv({
        NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test",
      }),
    ).toEqual({
      url: "https://example.supabase.co",
      publishableKey: "sb_publishable_test",
    });
  });

  it("rejects missing values", () => {
    expect(() => readSupabasePublicEnv({})).toThrow(
      "Missing required environment variable",
    );
  });

  it("rejects an invalid URL", () => {
    expect(() =>
      readSupabasePublicEnv({
        NEXT_PUBLIC_SUPABASE_URL: "not-a-url",
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test",
      }),
    ).toThrow("must be a valid URL");
  });
});
