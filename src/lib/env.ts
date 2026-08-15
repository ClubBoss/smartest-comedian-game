export type SupabasePublicEnv = {
  url: string;
  publishableKey: string;
};

export type SupabaseServerEnv = SupabasePublicEnv & {
  serviceRoleKey: string;
};

type EnvSource = Record<string, string | undefined>;

function requireValue(name: string, value: string | undefined): string {
  if (!value || value.trim().length === 0) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
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
    serviceRoleKey: requireValue(
      "SUPABASE_SERVICE_ROLE_KEY",
      env.SUPABASE_SERVICE_ROLE_KEY,
    ),
  };
}
