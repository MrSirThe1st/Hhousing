# Prompt Template: Schema Change

Apply schema change: <name>

## Change Description

<what changes and why>

## Domain Impact

- Affected modules: <list>
- Backward compatibility: <yes/no + details>

## Migration Plan

1. Prisma schema update
2. Migration generation
3. Repository update
4. Contract update
5. Test update

## Safety Requirements

- Include rollback strategy
- Avoid breaking reads for old records
- Add data migration steps if needed

## Validation Checklist

- Migration applies in dev
- No runtime type drift
- Endpoint contracts updated
- Existing tests adjusted and passing

Constraints:
- TypeScript strict, no any.
- Validate external input with Zod.
- Enforce authn/authz for protected operations.
- Respect monorepo boundaries.
- Add tests for success and failure paths.
- Return structured errors only.
