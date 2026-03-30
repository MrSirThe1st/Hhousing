# MANDATORY PRE-WORK - READ BEFORE ANY CODE

## ALWAYS CHECK FIRST

Before any implementation, read these files in order:

### 1. PROJECT MEMORY
- **`project-updates.md`** - What changed recently, established patterns, solved issues
- **`project-context.md`** - Product direction, roles, entities, workflows, tech stack

### 2. PROJECT RULES
- **`docs/blueprint/charter/project-charter.md`** - Core rules, what to ask before doing
- **`docs/blueprint/ai/agent-system.md`** - AI-specific guardrails, workflow priority
- **`docs/blueprint/quality/quality-gates.md`** - Testing requirements, PR blockers

### 3. ARCHITECTURAL DECISIONS
- **`docs/decisions/ADR-*.md`** - Why certain approaches were chosen

## CRITICAL CONSTRAINTS

From docs above - burned into memory:
- **Runtime**: Middleware = Edge (no Node.js modules), API routes = Node.js
- **Auth**: Server-side only, cookie-based for web, no Bearer tokens in middleware
- **DB access**: Never from client, always through repository layer
- **Validation**: Zod at all API boundaries
- **Error shape**: `{ success: false, error: string, code?: string }`

## ASK BEFORE DOING

Per charter, get approval for:
- DB schema changes or migrations
- Auth/authorization behavior changes
- Package installs or major upgrades
- Large refactors or folder structure changes

## WORKFLOW

1. Read docs above
2. Implement smallest slice
3. Run: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`
4. Update `project-updates.md` if change is meaningful
