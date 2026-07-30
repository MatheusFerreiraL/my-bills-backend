# Security & Multi-Tenancy (AD-3, AD-4)

> Full spec reference: `MyBills-Technical-Specification.md` §3 (AD-3, AD-4), §7.

## AD-3 — Tenant scoping from day one

Every table carries an owner key (`user_id`), enforced in **every** query — ideally backed by Postgres
**row-level security**, not just application-layer filtering. This is the one architectural concern that is
genuinely expensive to retrofit (the risk being one user seeing another's balances), so it's adopted immediately
even though auth/billing infrastructure is deferred.

**Implication for API design:** every endpoint must resolve `user_id` from the request context and scope every
read/write to it, even in single-user mode today. Don't design endpoints that would need retrofitting once a
second real user exists — and since `mybills-frontend` only ever sees this through `api-contract.md`, get the
auth/session mechanism into that contract early rather than bolting it on later.

## AD-4 — Money representation

All monetary amounts: integer minor units + `currency_code`. No floats — anywhere, in storage or computation.
Currency code is stored even though v1 is EUR-only, to leave real multi-currency support possible later without
a schema migration.

## Uploaded files (import subsystem input)

- Treat as **untrusted input**: validate MIME type and size, never execute.
- Store outside any web root — object storage preferred.
- Apply a retention/cleanup policy.
- Statement contents are sensitive financial PII: access-controlled, and encrypted at rest wherever retained.
- **Open question:** keep original statements after import, or discard post-parse? (security vs. re-processing
  convenience — see `architecture-decisions.md` Open Questions item 5).

## Transport & auth

Standard transport encryption (TLS). Real authentication/authorization is explicitly deferred as a "cheap to add
later" concern — but the `user_id` boundary described above must be present from day one regardless, so that
turning on auth later is additive rather than a retrofit.

## Reliability

Ledger writes are transactional; an import commit is atomic per batch. The slow pure-derivation balance path
should remain available as an oracle to validate the fast checkpoint path once checkpoints exist (see
`ledger-and-balances.md`).
