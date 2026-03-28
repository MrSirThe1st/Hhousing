# Monorepo Profile

Use this profile when your project has multiple deployable apps and shared packages.

## Typical Shape

- `apps/*` for deployable apps
- `packages/*` for shared code

## Use With

- `shared/charter/project-charter.md`
- `shared/quality/*`
- `shared/ai/*`
- `shared/operations/adoption-playbook-core.md`
- `shared/templates/*`

## Profile Files

- `profiles/monorepo/architecture-map.md`
- `profiles/monorepo/dependency-boundaries.md`
- `profiles/monorepo/adoption-playbook.md`

## When To Choose This

Choose monorepo profile if at least one of these is true:
- You have 2+ apps sharing code.
- You need strict cross-package dependency control.
- You plan shared domain contracts across web/mobile/admin.
