import type { ApiResult } from "@hhousing/api-contracts";

export interface DatabaseEnvSource {
  DATABASE_URL?: string;
}

export interface DatabaseEnv {
  connectionString: string;
}

function asRequiredText(value: string | undefined): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

export function readDatabaseEnv(source: DatabaseEnvSource): ApiResult<DatabaseEnv> {
  const connectionString = asRequiredText(source.DATABASE_URL);

  if (connectionString === null) {
    return {
      success: false,
      code: "CONFIG_ERROR",
      error: "DATABASE_URL is required"
    };
  }

  return {
    success: true,
    data: {
      connectionString
    }
  };
}
