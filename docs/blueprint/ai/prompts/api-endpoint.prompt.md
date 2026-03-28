# Prompt Template: API Endpoint

Create endpoint: <method> <route>

## Purpose

<business outcome>

## Inputs

- Params: <schema>
- Query: <schema>
- Body: <schema>

## Outputs

- Success: <type>
- Error: `{ success: false, error: string, code: string }`

## Security Rules

- Authentication required: <yes/no>
- Authorization rule: <rule>
- Sensitive data policy: <what must be excluded>

## Data Access

- Use repository/service: <name>
- No direct client-side privileged calls

## Tests Required

1. Valid request success
2. Validation failure
3. Unauthorized/forbidden
4. Downstream failure mapped to sanitized error

Constraints:
- TypeScript strict, no any.
- Validate external input with Zod.
- Enforce authn/authz for protected operations.
- Respect monorepo boundaries.
- Add tests for success and failure paths.
- Return structured errors only.
