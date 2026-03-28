import { describe, expect, it } from "vitest";
import { readDatabaseEnv } from "./database-env.js";

describe("readDatabaseEnv", () => {
  it("returns connection string when configured", () => {
    const result = readDatabaseEnv({
      DATABASE_URL: "postgresql://user:pass@localhost:5432/app"
    });

    expect(result).toEqual({
      success: true,
      data: {
        connectionString: "postgresql://user:pass@localhost:5432/app"
      }
    });
  });

  it("returns config error when missing", () => {
    const result = readDatabaseEnv({});

    expect(result.success).toBe(false);
    if (result.success) {
      return;
    }

    expect(result.code).toBe("CONFIG_ERROR");
  });
});
