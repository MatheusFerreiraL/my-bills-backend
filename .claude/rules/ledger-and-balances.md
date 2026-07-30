# Ledger & Balances (AD-1 / AD-2)

> Full spec reference: `MyBills-Technical-Specification.md` §3 (AD-1, AD-2), §5.2, §5.3.

## The core rule

Accounts store **only** `initial_balance_minor`. There is no mutable `balance` column anywhere in the schema.
Every balance is *derived* by summing the ledger:

- **Current Balance** (current) = `initial_balance + Σ(paid transactions, date ≤ today)`
- **Projected Balance** (projected) = `initial_balance + Σ(paid + pending transactions)`
- **End-of-day balance** (used for the running balance lines in the Transactions view) = the same sum evaluated
  at an arbitrary date.

**Rejected alternative:** a mutable `balance` column incremented per insert. It is corrupted by edits, deletions,
back-dated entries, and pending/paid status flips, and cannot reproduce the running end-of-day balance lines the
Transactions screen shows. Do not reintroduce this even as an "optimization" — see the checkpoint mechanism
below instead.

## The single seam: `getAccountBalance`

```
getAccountBalance(account, date, { projected: boolean }) → amount_minor
```

- **Every** balance read in the entire system goes through this function. No endpoint, report, or background job
  sums transactions independently.
- Initially this is a pure derivation per the formulas above.
- Callers are unaware of which internal path served the number.
- Whatever this function returns is what gets exposed via the API — see `api-contract.md` for how it surfaces
  to `mybills-frontend`.

## Deferred checkpoint optimization

Do **not** build this until read latency actually warrants it at scale. When it's needed:

- Introduce `BALANCE_CHECKPOINT`: one stored closing balance per account per month.
- The live equation becomes `nearest checkpoint + Σ(transactions since that checkpoint)` — bounded to roughly
  one month of rows regardless of total ledger size.
- Both the pure-derivation path and the checkpoint path should be runnable in parallel and asserted equal in
  tests/canary checks, to catch checkpoint bugs before they reach a displayed figure.

**Known trade-off (must stay documented, not silently "fixed"):** a back-dated write invalidates every
checkpoint after its date and triggers a forward rebuild from that month. This is acceptable because most writes
land near "today" — **import is the dominant exception** (see `import-subsystem.md`, which is the concrete
reason checkpoints must be rebuildable, not just append-only).

## Balance adjustments

"Adjust balance" on an account must insert an explicit, audited balance-adjustment `TRANSACTION` — never rewrite
`initial_balance_minor` directly. **Acceptance criterion:** after any adjustment, `Σ(ledger)` still equals the
displayed balance exactly.

## Acceptance criteria to keep in mind when implementing

- Changing the selected month on any screen re-derives every figure from the ledger for that month — nothing
  reads from a stored running total.
- Toggling a transaction's status (paid ↔ pending) updates Current Balance vs. Projected Balance consistently, with no
  special-casing outside `getAccountBalance`.
