# Prompt Template: Feature Implementation

Implement feature: <feature-name>

## Context

- App: <web-user | web-admin | mobile>
- Domain module: <module-name>
- User story: <story>

## Boundaries

- Allowed packages: <list>
- Forbidden imports: app-to-app, domain-to-framework, client-to-privileged-server

## Contracts

- Request/response schema files: <paths>
- Domain invariants: <list>

## Security

- Required authn: <yes/no + method>
- Required authz: <role/ownership rules>
- Validation: Zod for all external input

## Deliverables

1. Production code
2. Tests for success and failure paths
3. Short docs update if contract changed

## Acceptance Criteria

- Lint/typecheck/tests/build pass
- No boundary violations
- No `any`
- Structured error responses

Constraints:
- TypeScript strict, no any.
- Validate external input with Zod.
- Enforce authn/authz for protected operations.
- Respect monorepo boundaries.
- Add tests for success and failure paths.
- Return structured errors only.
