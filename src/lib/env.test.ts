import { describe, expect, it } from "vitest";
import { readSupabasePublicEnv, readSupabaseServerEnv } from "./env";

const publicEnv = {
  NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test",
};

describe("Supabase environment contract", () => {
  it("accepts a valid public configuration", () => {
    expect(readSupabasePublicEnv(publicEnv)).toEqual({
      url: "https://example.supabase.co",
      publishableKey: "sb_publishable_test",
    });
  });

  it("prefers the modern Supabase secret key for server access", () => {
    expect(
      readSupabaseServerEnv({
        ...publicEnv,
        SUPABASE_SECRET_KEY: "sb_secret_modern",
        SUPABASE_SERVICE_ROLE_KEY: "legacy-service-role",
      }).adminKey,
    ).toBe("sb_secret_modern");
  });

  it("keeps legacy service-role compatibility for local and existing CI environments", () => {
    expect(
      readSupabaseServerEnv({
        ...publicEnv,
        SUPABASE_SERVICE_ROLE_KEY: "legacy-service-role",
      }).adminKey,
    ).toBe("legacy-service-role");
  });

  it("rejects missing public values", () => {
    expect(() => readSupabasePublicEnv({})).toThrow(
      "Missing required environment variable",
    );
  });

  it("rejects missing server admin credentials", () => {
    expect(() => readSupabaseServerEnv(publicEnv)).toThrow(
      "SUPABASE_SECRET_KEY or legacy SUPABASE_SERVICE_ROLE_KEY",
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
