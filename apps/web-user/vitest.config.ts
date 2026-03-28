import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@hhousing/api-contracts": resolve(
        __dirname,
        "../../packages/api-contracts/src/index.ts"
      ),
      "@hhousing/data-access": resolve(
        __dirname,
        "../../packages/data-access/src/index.ts"
      ),
      "@hhousing/domain": resolve(__dirname, "../../packages/domain/src/index.ts")
    }
  }
});
