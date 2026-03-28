# Security Baseline

## Input Validation

- Validate request body, params, and query using Zod.
- Reject unknown fields for sensitive endpoints.

## Authentication and Authorization

- Authenticate every protected endpoint.
- Authorize by role and resource ownership in server code.
- Never rely only on client checks.

## Data Access

- Use parameterized ORM/query APIs only.
- Do not expose service-role credentials to client code.
- Centralize privileged operations in server-only modules.

## Secrets and Config

- Secrets from environment variables only.
- No secrets in source, logs, tests, or snapshots.

## Error and Logging

- Do not return internal DB/provider errors to clients.
- Log enough context for incident investigation without leaking secrets.

## Dependency and Supply Chain

- Pin versions.
- Run dependency audit in CI.
- Block known high/critical vulns unless formally waived.

## Security Checklist For New Endpoint

1. Input schema exists and is enforced.
2. Authn check exists.
3. Authz check exists.
4. Data access uses approved repository path.
5. Error responses are sanitized.
6. Success and failure paths are tested.
