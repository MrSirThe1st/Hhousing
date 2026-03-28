# Skill: Code Review (Risk First)

## Review Order

1. Security vulnerabilities
2. Data integrity and authorization gaps
3. Boundary and architecture violations
4. Behavioral regressions
5. Test coverage gaps
6. Maintainability concerns

## Required Review Output

For each finding include:
- Severity: critical/high/medium/low
- Location: file and line
- Risk summary
- Concrete fix suggestion

## Rejection Triggers

- Missing authz in protected path
- Unvalidated external input
- Introduction of `any` in core paths
- Cross-app imports
- Missing negative-path tests
