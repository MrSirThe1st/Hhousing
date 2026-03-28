# Adoption Playbook (Core)

## Week 1 Rollout

1. Add blueprint under `docs/blueprint`.
2. Align repository boundaries to the selected profile architecture docs.
3. Create `project-updates.md` from template at repo root.
4. Implement lint/type/boundary rules.
5. Wire CI quality gates.
6. Run one vertical slice as pilot.

## Week 2 Stabilization

1. Review failed checks and refine rules.
2. Remove duplicate types and business logic.
3. Improve test templates for repeated flows.
4. Lock prompt templates and team conventions.
5. Audit `project-updates.md` quality and keep entries concise.

## Team Workflow

1. Check `project-updates.md` before searching wider project context.
2. Start task with prompt template.
3. Ask approval for schema, config, auth, package, structure, or major architectural changes.
4. Implement in smallest vertical increments.
5. Run local gates before PR.
6. Update `project-updates.md` for meaningful changes.
7. Use PR checklist.
8. Review with risk-first format.

## `project-updates.md` Policy

Keep entries structured with:
- Date
- Change type
- Description
- Impact
- Tests

Do not log trivial formatting or noisy churn.

## Metrics

Track weekly:
- PR cycle time
- Rework rate after review
- CI first-pass rate
- Security finding count
- Escaped defects
