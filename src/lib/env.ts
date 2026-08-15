export type SupabasePublicEnv = {
  url: string;
  publishableKey: string;
};

export type SupabaseServerEnv = SupabasePublicEnv & {
  adminKey: string;
};

type EnvSource = Record<string, string | undefined>;

function requireValue(name: string, value: string | undefined): string {
  if (!value || value.trim().length === 0) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function readSupabaseAdminKey(env: EnvSource): string {
  const secretKey = env.SUPABASE_SECRET_KEY?.trim();
  if (secretKey) return secretKey;

  return requireValue(
    "SUPABASE_SECRET_KEY or legacy SUPABASE_SERVICE_ROLE_KEY",
    env.SUPABASE_SERVICE_ROLE_KEY,
  );
}

export function readSupabasePublicEnv(
  env: EnvSource = process.env,
): SupabasePublicEnv {
  const url = requireValue("NEXT_PUBLIC_SUPABASE_URL", env.NEXT_PUBLIC_SUPABASE_URL);
  const publishableKey = requireValue(
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );

  try {
    new URL(url);
  } catch {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL must be a valid URL.");
  }

  return { url, publishableKey };
}

export function readSupabaseServerEnv(
  env: EnvSource = process.env,
): SupabaseServerEnv {
  return {
    ...readSupabasePublicEnv(env),
    adminKey: readSupabaseAdminKey(env),
  };
}
