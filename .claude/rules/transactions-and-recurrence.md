# Transactions, Installments & Recurring (AD-5)

> Full spec reference: `MyBills-Technical-Specification.md` §3 (AD-5), §5.3, §5.8.

## TRANSACTION entity

`id`, `user_id`, `account_id`, `category_id`, `type` (income \| expense), `status` (paid \| pending), `date`,
`amount_minor`, `currency_code`, `description`, `is_fixed`, `is_ignored`, `installment_plan_id?`,
`recurrence_rule_id?`, `import_batch_id?`, `fingerprint`, soft-delete fields, audit fields.

## Installments vs. recurring — kept as two separate mechanisms

Despite similar implementation shape, these are semantically distinct. Do not merge into one generic
"repeating transaction" abstraction.

### Installments (installment plan)
- One purchase sliced into N payments.
- **All N transactions are materialized at creation time** — no lazy generation.
- Linked by `installment_plan_id` + a sequence index.
- Each row is **independently payable** (paying installment 3 doesn't affect 4).
- Sequence labels are **frozen at creation**: `[i/N]`, e.g. `Student loan (5/8)`. They don't renumber if an
  installment is later deleted or refunded.

### Recurring fixed expenses (fixed expense)
- N **independent obligations** of the full amount, driven by a `RecurrenceRule`.
- **Lazily generated per month** — never fully materialized in advance, no infinite row generation.
- End condition is **optional**: count, end-date, or indefinite.
- Enter the ledger as *projected expenses* (pending) until paid.

## Cross-cutting fields

- `is_ignored` — a **display filter**, not a soft-delete. The transaction stays in the ledger (so balances
  reconcile) but is excluded from charts and budget actuals.
- `is_fixed` — marks a transaction as originating from the recurring mechanism (for UI/reporting), distinct from
  `recurrence_rule_id` which links back to the generating rule.

## New Transaction creation flow (what the endpoint needs to support)

Amount (integer minor units), paid/pending toggle, payment date, description, category, account, tags,
**fixed expense** toggle (→ recurring path), **installment** toggle (→ N materialized rows with `[i/N]`
labels), and the "Ignore Transaction" toggle (`is_ignored`). Income and expense share the same shape; `type`
differentiates them. Once this endpoint's shape is decided, document it in `api-contract.md`.
