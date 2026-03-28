# Skill: Build Vertical Feature Slice

## When To Use

Use when implementing an end-to-end feature touching UI, API, domain logic, and persistence.

## Procedure

1. Confirm feature boundary and modules.
2. Define/verify schemas in shared contracts.
3. Implement domain rule first.
4. Implement repository/service layer.
5. Implement endpoint.
6. Implement UI wiring in target app.
7. Add tests for each layer.
8. Run quality gates.

## Guardrails

- No business rule duplication in UI.
- No skipping validation/auth checks.
- No bypassing data-access layer.

## Output Format

- Files changed
- Tests added
- Risks and follow-ups
