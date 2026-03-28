# Skill: Bugfix Workflow

## Goal

Fix root cause, not symptoms.

## Procedure

1. Reproduce issue with explicit steps.
2. Isolate failing layer (UI, service, domain, data access).
3. Add/adjust failing test first when feasible.
4. Implement minimal safe fix.
5. Verify no boundary/security regressions.
6. Run full gates if change touches shared packages.

## Output Requirements

- Root cause statement
- Fix summary
- Tests proving fix
- Residual risk and follow-up tasks
