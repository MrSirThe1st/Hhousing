import type { ApiResult } from "@hhousing/api-contracts";

export interface DatabaseEnv {
  connectionString: string;
}

export type DatabaseEnvSource = Record<string, string | undefined>;

export function readDatabaseEnv(source: DatabaseEnvSource): ApiResult<DatabaseEnv> {
  const connectionString = source.DATABASE_URL?.trim();
  if (!connectionString) {
    return {
      success: false,
      code: "CONFIG_ERROR",
      error: "DATABASE_URL is required"
    };
  }

  return {
    success: true,
    data: { connectionString }
  };
}
