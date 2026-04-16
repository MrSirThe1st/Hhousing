# Finance Controls (Source-of-Truth Rules)

Status: canonical controls for move-in, move-out, reporting, and settlement.

## Core Invariants

1. Ledger is the only financial source of truth.
2. Operational lease balances and financial account balances are separate views.
3. Snapshot outputs are immutable audit artifacts, never source data.
4. Deposit is liability movement only, never operational revenue.

## Ledger Semantics

- `entry_type` = accounting behavior (`charge`, `payment`, `liability_movement`, `adjustment`)
- `category` = business meaning (`rent`, `deposit`, `refund`, `damage`, `fee`, ...)

DB constraints must enforce allowed `entry_type`/`category` combinations.

## Deposit Rule (Hard)

- Deposit in: increase liability.
- Deposit out: decrease liability.
- Deposit cannot post as operational charge or revenue event.

## Shared Proration Rule

Proration logic is single-source shared service used by move-in and move-out.
No duplicate formulas in UI routes or feature-specific services.

## Closure Snapshot Rule

Snapshot generation boundary is deterministic:

- Generate snapshot from ledger rows up to `closure_ledger_event_id`.
- Do not use timestamp-only boundaries.
- Store snapshot + boundary id + hash.
- Snapshot is immutable after closure.

## Reconciliation

Required checks:

1. Lease operational balance projection matches ledger-derived lease balance.
2. Deposit liability projection matches ledger-derived liability totals.
3. Move-out snapshot totals match ledger totals at `closure_ledger_event_id`.
4. Closed move-out has complete settlement state.

## Severity Classes

1. Blocking: invariant violation, deposit misclassification, invalid closure.
2. Drift anomaly: recurrent epsilon mismatches, misuse spikes, adjustment churn.
3. Warning: cache staleness and non-critical metadata mismatch.

## Implementation Gate

Any new finance-related route must post via the finance posting service and must not bypass ledger writes.
