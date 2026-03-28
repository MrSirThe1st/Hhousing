# Project Updates

Use this file as the first project memory source before searching the codebase.

## Entry Rules

- Append only meaningful changes.
- Group related changes into one entry.
- Use concise, factual descriptions.
- Include DB, API, structure, and important logic decisions.
- Record deferred testing gaps when relevant.

## Template

## YYYY-MM-DD
- Change type: DB | API | Frontend | Mobile | Infra | Other
- Description: <what changed>
- Impact: <contracts, tables, routes, folders, logic>
- Tests: <added, updated, or deferred>

## Example

## 2026-03-28
- Change type: DB
- Description: Added `resources` table and linked media records.
- Impact: New resource creation flow uses shared DTOs and repository contracts.
- Tests: Added repository tests for create and duplicate-name failure.