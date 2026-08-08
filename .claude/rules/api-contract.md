# API Contract — mybills-backend ↔ mybills-frontend

> **Mirrored file** — identical copy exists in `mybills-backend` and `mybills-frontend`. Edit both when this
> changes. This file did not exist before the two repos were split apart, and it is the single most important
> addition the split requires: with backend and frontend as separate codebases, there is no shared type system,
> no shared function signatures, and no way for one repo to see the other's implementation. The REST API is now
> the *entire* interface between them, and if it isn't written down somewhere both repos read, the frontend has
> no reliable way to know what the backend actually exposes.

## Current state: first real endpoints (Categories, Transactions)

Categories CRUD (create, list, edit) and Transactions (create, edit, delete, status toggle) are implemented —
see the "Categories" and "Transactions" sections below for the actual contract. Every other module in the
sketch further down this file is still just a sketch, not implemented — treat only "Auth / Tenant Scoping",
"Categories", and "Transactions" as real today.

Until the rest is designed, treat `MyBills-Technical-Specification.md` §5 (the functional requirements and
acceptance criteria per screen) as the **interim behavioral contract** for anything not documented concretely
yet — it says what each screen needs, even though it doesn't yet say the exact route, verb, or JSON shape.

**Do not let frontend work invent its own assumed request/response shapes as a substitute for this file.** If
`mybills-frontend` needs an endpoint that isn't documented here yet, that's a signal to define it (in both
repos) before writing client code against a guess.

## Auth / Tenant Scoping (interim mechanism — read before calling any endpoint)

There is no real authentication system yet. Every endpoint requires an `x-user-id` request header:

- **Header:** `x-user-id: <uuid>`
- **Required on every request**, to every endpoint, with no exceptions. Enforced globally by a guard, not
  per-controller — a new endpoint gets this for free.
- **Format:** a UUID identifying the tenant. Invalid or missing → `400 Bad Request`.
- All reads/writes are scoped to this user via Postgres row-level security (AD-3) — there is no way to act on
  another tenant's data even by guessing an id; cross-tenant `GET`/`PATCH`/`DELETE` by id return `404`, not
  `403`, to avoid confirming another tenant's record exists.
- **This is explicitly temporary.** It exists only because there is no real auth/session system yet. When real
  auth ships, this header will be replaced by a session/token mechanism, and this section must be updated in
  both repos at that time — do not build long-lived client logic that assumes `x-user-id` is permanent.

## Categories

### `POST /categories` — create a category
Request body:
```json
{ "name": "Groceries", "icon": "shopping-cart", "color": "#22C55E", "type": "expense" }
```
- `type` is one of `"expense"`, `"income"`.
- `color` is a hex string (`#RGB` or `#RRGGBB`).
- `icon` is a frontend-interpreted icon slug, not a URL/asset.
- All four fields required. `201` on success with the created row (including generated `id`, `userId`,
  `createdAt`, `updatedAt`).
- `400` on validation failure (missing/invalid field, or invalid/missing `x-user-id`).

### `GET /categories` — list the requesting user's categories
- No filters yet. Returns every non-deleted category owned by the tenant in `x-user-id`.
- `200` with a JSON array of category rows.

### `PATCH /categories/{id}` — partial update
Request body: any subset of `name`, `icon`, `color`, `type`.
- `200` with the updated row.
- `404` if `id` doesn't exist or doesn't belong to the requesting tenant (RLS-enforced — indistinguishable from
  "doesn't exist" by design).

### `DELETE /categories/{id}` — not yet implemented
- **Always returns `501 Not Implemented`.** Deletion semantics (block vs. reassign vs. cascade soft-delete) are
  an open architecture question — see `architecture-decisions.md` Open Question 1. Do not build frontend UI that
  assumes any particular delete behavior yet; there is intentionally no way to delete a category today.

## Transactions

Every mutating endpoint below returns the same envelope shape:
```json
{
  "transaction": { "id": "...", "userId": "...", "accountId": "...", "categoryId": "...", "type": "expense",
                    "status": "pending", "date": "2026-08-08", "amountMinor": 4200, "currencyCode": "EUR",
                    "description": "...", "isIgnored": false, "isFixed": false, "createdAt": "...",
                    "updatedAt": "...", "deletedAt": null },
  "account": { "id": "...", "currentBalanceMinor": 12000, "projectedBalanceMinor": 7800 }
}
```
`currentBalanceMinor`/`projectedBalanceMinor` are always computed via the backend's `getAccountBalance` seam
(AD-1/AD-2), evaluated as of "now", for the transaction's account **after** the mutation — never summed
client-side, and never summed anywhere else in the backend either. `is_ignored` never excludes a transaction
from these figures — it's a display filter only, not a soft-delete (see `domain-model.md`).

Not yet supported by any of these endpoints (explicitly out of scope for now): `is_fixed` toggle, installment
materialization, recurrence-rule generation, import-batch linkage. Sending these has no effect — they are not
accepted by the request schema. There is also no `GET /transactions` list endpoint yet (see the sketch below).

### `POST /transactions` — create
Request body:
```json
{ "type": "expense", "status": "pending", "accountId": "...", "categoryId": "...", "date": "2026-08-08",
  "amountMinor": 4200, "description": "Groceries", "isIgnored": false, "tagIds": ["..."] }
```
- `type`: `"income"` | `"expense"`. `status`: `"paid"` | `"pending"`.
- `accountId` required; `categoryId` optional (uncategorized is valid); `date` is date-only (`YYYY-MM-DD`);
  `amountMinor` is a positive integer (AD-4, no floats — the sign is implied by `type`, never encoded in the
  amount); `description` optional; `isIgnored` optional (default `false`); `tagIds` optional array of existing
  tag ids.
- `201` with the envelope above.
- `400`: validation failure, or `accountId`/`categoryId`/any `tagId` doesn't exist or belongs to another tenant
  (surfaced as "Referenced account, category, or tag does not exist" — checked explicitly against the
  requesting tenant, not left to the database foreign keys alone, since FK checks in Postgres are not subject
  to row-level security and would otherwise silently allow referencing another tenant's row).

### `PATCH /transactions/{id}` — partial update
Request body: any subset of the `POST` fields, including `status` directly.
- If `tagIds` is present in the body, it **fully replaces** the transaction's tag set (not a merge).
- Moving `accountId` to a different account: the response's `account` block reflects the **new** account's
  balances, not the old one's.
- `200` with the envelope above. `404` if `id` doesn't exist / isn't the requesting tenant's (RLS-backed,
  indistinguishable from "doesn't exist", same as Categories). `400` on validation or a cross-tenant/nonexistent
  reference, as above.

### `PATCH /transactions/{id}/status` — toggle paid ↔ pending
No request body. Flips the transaction's current status (`paid`→`pending` or `pending`→`paid`).
- `200` with the envelope above, reflecting the new status and updated balances.
- `404` if not found / not owned by the tenant.
- This is a convenience endpoint for the common "mark as paid/unpaid" action; `PATCH /transactions/{id}` with an
  explicit `status` field achieves the same underlying change.

### `DELETE /transactions/{id}` — soft-delete
- **Returns `200` with the envelope above, not `204`.** This is intentional and differs from typical REST
  practice: every mutating endpoint in this contract must report the account's post-mutation balance, and a
  bodyless `204` has nowhere to put that. The response's `transaction.deletedAt` is set; the transaction no
  longer counts toward any future balance calculation (excluded via `deletedAt IS NULL` inside
  `getAccountBalance`), which is why the returned balances already reflect its removal.
- This is a soft-delete: the row is retained (financial records are never hard-deleted — see
  `domain-model.md`'s cross-cutting rules), so history isn't rewritten and existing tag associations don't hit
  the `transaction_tags` restrict-delete foreign key.
- `404` if not found / not owned by the tenant.

## What belongs here once endpoints exist

For each endpoint: method + path, purpose, request shape, response shape (including which figures are
backend-computed vs. pass-through), auth/tenant-scoping notes, and error cases worth calling out (e.g. what an
ambiguous-date import row's response looks like, or what a duplicate-transaction dedup flag looks like in the
preview response).

Suggested structure once real design starts:

```
## Accounts
GET /accounts → list, each with current_balance_minor, projected_balance_minor
POST /accounts/{id}/adjust → creates a balance-adjustment transaction

## Transactions
GET /transactions?month=&type=&category=&account=&q= → filtered list + header badges
(create/edit/delete/status-toggle are already real — see the "Transactions" section above; this list
endpoint, and is_fixed/installment support on create, are the only pieces still just a sketch)

## Credit Cards
GET /credit-cards/{id}/invoices/current → open invoice + available limit
POST /invoices/{id}/pay → creates the one bridge transaction

## Budgets
POST /budgets → creation flow (income, savings%, envelopes, category limits)
GET /budgets/current → plan snapshot + live actuals

## Import
POST /imports → upload, returns batch in `parsing` status
GET /imports/{id}/preview → rows with dedup flags, confidence, category suggestions
POST /imports/{id}/commit → commits reviewed rows
POST /imports/{id}/reverse → undoes a committed batch
```

Treat the above as a sketch to replace with the real design, not a spec to implement as-is — it exists to show
the *shape* this file should take, not to lock in routes before they're actually decided.

## Keeping this file current — three tiers, not equally reliable

Hand-copying this file between two repos every time the API changes is exactly the kind of drift risk called out
in `architecture-decisions.md` Open Question 7. There are three ways to address it, and they are **not
equivalent** — don't mistake the first for a real guarantee:

**Tier 1 — behavioral discipline (active now).** The working agreement in this repo's root `CLAUDE.md` states
that any change adding, removing, or modifying an endpoint must update this file in both repos, in the same
session. This costs nothing and is worth keeping, but it only works if the change is made through an agent or
developer who actually reads and follows that instruction — a manual edit, a different tool, or a rushed change
can skip it silently. Treat this as a useful habit, not a system property that can be relied on.

**Tier 2 — a CI drift-check (adopt once backend code exists).** A CI step that fails a pull request if files
under the backend's route/controller layer changed but this file wasn't touched in the same PR. This doesn't
generate anything and doesn't require picking a framework first — it just turns "someone forgot" into a hard CI
failure instead of a hope. This is the first concrete milestone worth actually building, as soon as there's a
real route layer to watch.

**Tier 3 — generate the contract from code (adopt once a backend framework is chosen).** Most backend
frameworks generate an OpenAPI spec directly from route definitions for free (e.g. FastAPI, NestJS, Django REST
Framework all do this natively). Once one is chosen, prefer treating the generated spec as the actual source of
truth, with this markdown file either auto-written from it or replaced by a link to it. This is the only tier
where drift becomes structurally impossible rather than just discouraged, because the docs are derived from the
code instead of describing it from memory.

**Recommended sequencing:** Tier 1 is already active. Adopt Tier 2 as soon as backend route code exists — it's
cheap and catches exactly the failure mode this section exists to prevent. Fold Tier 3 into the framework choice
itself, rather than treating it as separate follow-up work — most frameworks give it away for free once picked.

**Update (2026-07-30) — framework chosen, Tier 3 not yet adopted.** The backend framework is now NestJS (see
root `CLAUDE.md` Recent decisions log). NestJS generates an OpenAPI spec natively from decorated
controllers/DTOs via `@nestjs/swagger` — no extra tooling to add. There are no routes yet (every module under
`src/modules/` is still an empty placeholder), so there's nothing to generate from today. Once the first real
endpoint is written: wire `SwaggerModule.setup()` in `src/main.ts`, and from then on treat the generated spec as
this file's replacement/source of truth per Tier 3 above, rather than hand-maintaining both.

**Update (2026-08-08) — first real endpoint shipped, Swagger wired.** Categories CRUD is the first real
route layer in the repo. `SwaggerModule.setup()` is now wired in `src/main.ts` (UI at `/api-docs`, spec at
`/api-docs-json`). Per Tier 3 above, treat the generated spec as the source of truth for exact request/response
shapes going forward; this markdown file stays the human-readable summary and the place `mybills-frontend`
checks without needing a running backend. Tier 2 (a CI drift-check between route code and this file) is not
adopted yet — still Tier 1 (behavioral discipline) for keeping this file in sync.

**Update (2026-08-08) — Transactions create/edit/delete/status-toggle shipped.** Every mutating Transactions
endpoint returns `{ transaction, account: { id, currentBalanceMinor, projectedBalanceMinor } }`, with both
balance figures always computed through the backend's `getAccountBalance` seam — see the "Transactions" section
above. `DELETE` is a `200` with that body, not a `204`, specifically so it can carry the post-deletion balance.
Still Tier 1 for keeping this file in sync with the route layer.
