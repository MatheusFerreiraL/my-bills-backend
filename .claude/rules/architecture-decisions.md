# Architecture Decisions (AD-1.. AD-6)

> **Mirrored file** — identical copy exists in `mybills-backend` and `mybills-frontend`. Edit both when this
> changes. Unscoped — loads every session. Full spec reference: `MyBills-Technical-Specification.md` §3.

These are owned and enforced by the **backend**, but every client on every platform must respect them — no
frontend, on any platform, should ever try to work around them locally.

## AD-1 — Derived Ledger (Source of Truth)
Accounts store only `initial_balance`. All balances are computed from the ledger:
- **Current Balance** (current balance) = `initial_balance + Σ(paid transactions with date ≤ today)`
- **Projected Balance** (projected balance) = `initial_balance + Σ(paid + pending transactions)`
- **End-of-day balance** = same sum evaluated at a given date.

*Rejected alternative:* a mutable `balance` column incremented per insert — corrupted by edits, deletions,
back-dated entries, and pending/paid status changes; cannot reproduce running end-of-day balance lines.

## AD-2 — Balance Function Seam + Deferred Checkpoints
All balance reads go through one backend function: `getAccountBalance(account, date, {projected})`. No client
ever sums transactions itself to produce a balance figure.

- Initially: pure derivation per AD-1.
- **Trigger for optimization:** only when read latency actually warrants it at scale.
- When triggered: month-end checkpoints, so the equation becomes `nearest checkpoint + Σ(transactions since
  checkpoint)`, bounded to ~one month of rows. Callers never know which path produced the number.
- **Known trade-off:** a back-dated write invalidates checkpoints after its date and requires a forward rebuild.
  Import is the main real-world source of this (see `mybills-backend`'s `import-subsystem.md`).

## AD-3 — Tenant Scoping from Day One
Every table carries an owner key (`user_id`), enforced in every query, ideally backed by Postgres row-level
security. Genuinely expensive to retrofit (risk: cross-user data leakage), so adopted immediately even though
auth/billing are deferred.

## AD-4 — Money Representation
All monetary amounts: integer minor units + `currency_code`. No floats anywhere in storage or computation —
this includes any client-side formatting/display code too.

## AD-5 — Installments vs. Recurring Are Separate Mechanisms
- **Installments (installment plan):** materialized upfront at creation, linked by `installment_plan_id` + sequence,
  frozen label `[i/N]`.
- **Recurring fixed expenses (fixed expense):** lazily generated per month from a `RecurrenceRule`, optional end
  condition.
- Kept semantically distinct despite implementation similarity.

## AD-6 — Multi-Repo, Multi-Client Architecture *(open — not yet fully locked in)*
The product ships as **separate GitHub repos per client** (`mybills-backend`, `mybills-frontend`, and later
`mybills-desktop` / `mybills-mobile`), all consuming the same backend REST API. Locked in: the repo split itself,
and the rule that one backend serves every client identically. **Still open:** the actual desktop/mobile tech
stack — see `cross-platform-strategy.md` (in `mybills-frontend`) for the trade-offs. Promote the stack decision
here, in both repos, once it's made.

---

## Open Questions (resolve before touching the relevant module)

1. **Account/category deletion semantics** when records are in use (block vs. reassign vs. cascade soft-delete).
2. **Credit-card edge cases:** partial invoice payments, purchases on the closing day, refunds.
3. **Custom budget periods** spanning partial months — exact period model and reconciliation with month-filtered
  screens.
4. **Bank profile sharing:** strictly per-user, or a shared library of common bank formats?
5. **PDF retention:** keep original statements after import, or discard post-parse?
6. **Desktop/mobile stack (AD-6):** what will desktop and mobile actually be built with, will they be their own
  repos (`mybills-desktop`, `mybills-mobile`), and how much becomes genuinely shared vs. platform-specific? See
  `cross-platform-strategy.md`.
7. **Mirrored-file drift (new, from the repo split):** is manual copy-paste sufficient long-term for
  `architecture-decisions.md` / `domain-model.md` / `api-contract.md`, or does this warrant a shared package /
  submodule / small third repo once the product grows? Revisit if drift actually causes a bug.

## Assumptions (confirm before relying on them)

1. EUR-only for v1; currency code stored for future-proofing, not real multi-currency/FX.
2. Single fixed timezone for month boundaries; pending/future-dated transactions bucket by `date`.
3. Savings Envelopes are allocations, not real transfers, in v1.
4. PDF import is acceptable as review-mandatory, best-effort rather than fully automatic.
5. Desktop and mobile are planned but unscheduled; no tech stack or repo has been created for either yet.

## Out of Scope (v1)

Multi-currency/FX · investments & assets · shared/household accounts · Open Banking / live bank connections ·
auto-detection of installments/recurring from imports · ML-based category inference (rule-based only). Desktop
and mobile clients are planned but out of scope for the current build phase.
