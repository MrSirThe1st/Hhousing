# PR Checklist

## Architecture

- [ ] No cross-app imports
- [ ] Business logic moved to shared domain where reusable
- [ ] Dependency boundaries respected

## Quality

- [ ] Lint passes
- [ ] Typecheck passes
- [ ] Tests pass
- [ ] Build passes

## Security

- [ ] Input validation added/updated
- [ ] Authn/Authz checks verified
- [ ] No secret leakage
- [ ] Errors sanitized for client responses

## Operability

- [ ] Logs added for new failure points
- [ ] Migration and rollback impact reviewed
- [ ] Monitoring impact documented if relevant

## Documentation

- [ ] Contract/type changes documented
- [ ] Architectural decision documented if boundary changed
