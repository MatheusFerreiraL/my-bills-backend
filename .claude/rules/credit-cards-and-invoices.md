# Credit Cards & Invoices

> Full spec reference: `MyBills-Technical-Specification.md` §5.4.

## The core rule

A card purchase **never moves account balance**. It accrues to the card's **open invoice** for the billing
cycle defined by `closing_day → due_day`. The only bridge between card spend and the account ledger is: paying
an invoice creates **exactly one** expense `TRANSACTION` in the chosen account, and marks the invoice `paid`.

## Entities

- **CREDIT_CARD** — `id`, `user_id`, `name`, `credit_limit_minor`, `closing_day`, `due_day`.
- **INVOICE** — `id`, `credit_card_id`, `cycle_start`, `cycle_end`, `due_date`, `status` (open \| closed \|
  paid), `settled_transaction_id?`.
- **CARD_TRANSACTION** — deliberately a distinct type from `TRANSACTION` because it settles into an invoice, not
  the account ledger. Don't conflate the two tables or flows.

## Computation

`Available Limit` (available limit) = `credit_limit − open-invoice balance`.

## Open edge cases (do not implement silently — resolve first, see `architecture-decisions.md` Open Questions)

- **Partial invoice payments** — is a partial payment supported at all in v1, and if so how does it affect
  `status`?
- **Purchases dated near the closing day** — which cycle does a transaction dated exactly on `closing_day` fall
  into?
- **Refunds/credits** — how do they net against an open or already-closed invoice?

These are explicitly unresolved in the spec. Flag before choosing a behavior rather than picking one silently.
