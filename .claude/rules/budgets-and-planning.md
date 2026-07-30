# Budgets

> Full spec reference: `MyBills-Technical-Specification.md` §5.5.

## Entities

- **BUDGET** — `id`, `user_id`, `period_type` (monthly \| custom), `period_start`, `period_end`,
  `planned_income_minor`, `savings_percent`.
- **CATEGORY_BUDGET** — `budget_id`, `category_id`, `limit_minor` (or percent).
- **SAVINGS_ENVELOPE** — `budget_id`, `name`, `allocation_minor`. Treated purely as an **allocation**
  in v1 — it does not move money and does not hit the ledger.

## Computation chain (computed once, at creation)

```
spending_budget = planned_income × (1 − savings_percent) − Σ(envelope allocations)
```

## Snapshot vs. live — the rule that matters most here

**The plan itself is a stored snapshot.** It is computed once at creation and does **not** change when
transactions are added later. Only the *actuals* shown against the plan are computed live:

- `Total Spent` (per category) = `paid expenses + projected expenses` for that category in the period.
- `Remaining` = `limit − total spent`.

**Acceptance criterion:** actuals in the budget table are always computed live from transactions in the period;
re-running the same query later with more transactions changes the actuals but never the stored plan figures.

## Period model

Monthly periods reuse the standard month-filter logic used everywhere else. **Custom periods** (spanning partial
months) are an open question — see `architecture-decisions.md` Open Questions item 3 — because they break the
"everything filters by month" assumption used by the dashboard/transactions/reports screens. Resolve the period
model explicitly before implementing custom-period budgets.

## Creation flow the API needs to support

Planned income (client can show a last-3-months average as a hint, computed from actuals — not stored on the
budget) → savings % → optional savings envelopes → computed spending budget + per-envelope savings → optional
per-category limits (€ or %, skippable per-category or entirely). Document the exact endpoint shape in
`api-contract.md` once designed.
