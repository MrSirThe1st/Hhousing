# MANDATORY PRE-WORK - READ BEFORE ANY CODE

## ALWAYS CHECK FIRST
Before any implementation, read these files in order:

### 1. PROJECT MEMORY
- **`project-updates.md`** — What changed recently, established patterns, solved issues
- **`project-context.md`** — Read on every task (slim, core facts only)
- **`docs/context/roles-and-auth.md`** — Read when task touches auth, roles, or permissions
- **`docs/context/features-*.md`** — Read when task touches that specific module
- **`docs/context/brand.md`** — Read when task touches UI, copy, or localization.

### 2. PROJECT RULES
- **`docs/blueprint/ai/AGENT_RULES.md`** — All agent rules: standards, workflow, PR gates, delivery priority

### 3. ARCHITECTURAL DECISIONS (ON DEMAND ONLY)
- **`docs/decisions/ADR-*.md`** — Read only when task needs a specific decision. Do not auto-inject into context.

## CRITICAL CONSTRAINTS
Burned into memory from the above:
- **Runtime**: Middleware = Edge (no Node.js modules), API routes = Node.js
- **Auth**: Server-side only, cookie-based for web, no Bearer tokens in middleware
- **DB access**: Never from client, always through repository layer
- **Validation**: Zod at all API boundaries
- **Error shape**: `ApiResult<T>` — `{ success: true; data: T } | { success: false; error: string }`

## ASK BEFORE DOING
- DB schema changes or migrations
- Auth/authorization behavior changes
- Package installs or major upgrades
- Large refactors or folder structure changes

## WORKFLOW
1. Read `project-updates.md` + `project-context.md` + `AGENT_RULES.md`
2. Implement smallest slice
3. Run: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`
4. Update `project-updates.md` if change is meaningful