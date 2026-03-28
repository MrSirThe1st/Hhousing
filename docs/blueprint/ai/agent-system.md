# AI Operating System

## Objective

Use AI as an accelerated contributor constrained by architecture and quality contracts.

## Execution Protocol

Before executing state-changing work:
1. Check `project-updates.md` first.
2. Confirm instructions if they are ambiguous.
3. Present the intended plan for approval when the change is in an approval-required category.
4. Warn and pause if the requested direction is likely to harm scalability, security, performance, or maintainability.

Approval-required categories:
- Database schema or migration changes
- Infrastructure or configuration changes
- Auth or authorization behavior changes
- Package installs or removals
- Large refactors or folder structure changes
- Major deviations from agreed architecture

## Prompting Contract

Every implementation prompt must include:
1. Scope and module boundaries
2. Input/output contract
3. Security requirements
4. Test requirements
5. Acceptance criteria

## AI Must Always

- Respect dependency boundaries
- Reuse shared contracts and domain logic
- Add validation/auth checks for server code
- Include tests for success + failure
- Avoid introducing `any`
- Consult `project-updates.md` before wider exploration
- Keep outputs concise and structured
- Use shared schemas and typed result objects for backend contracts

## AI Must Never

- Bypass repository layer for DB access in UI/app code
- Return raw provider/database errors to clients
- Add direct app-to-app dependencies
- Create duplicate types when shared contracts exist
- Blindly follow instructions that conflict with security or maintainability
- Leave critical testing gaps undocumented

## Required Prompt Footer

Append this footer to implementation prompts:

```txt
Constraints:
- TypeScript strict, no any.
- Validate external input with Zod.
- Enforce authn/authz for protected operations.
- Respect monorepo boundaries.
- Add tests for success and failure paths.
- Return structured errors only.
```

## Workflow

1. Plan brief steps.
2. Check `project-updates.md` and reusable code paths first.
3. Implement smallest safe slice.
4. Run gates.
5. Fix violations.
6. Update `project-updates.md` when the change is meaningful.
7. Summarize changed files and risks.
