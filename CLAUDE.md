# CLAUDE.md — mybills-backend

> Root index for this repo. **This repo is the entire backend** for MyBills — a separate GitHub project from
> `mybills-frontend` (and, later, `mybills-desktop` / `mybills-mobile`). Detailed, stable instructions live in
> `.claude/rules/` and load automatically. This file stays short — it's the map, not the content. See
> `.claude/rules/README.md` for how the rule set is organized, and note the mirroring caveat there: some files
> in this repo are duplicated from `mybills-frontend` because the two repos can't share context directly.

---

## 🔄 PROJECT STATUS — backend (this repo only)

**Last updated:** 2026-08-08
**Phase:** Scaffolding
**Current focus:** Backend stack chosen and project scaffolded (module folders, lint/test config, Postgres
connection module). First real endpoints shipped: Categories CRUD. Next up: schema design for the remaining
entities (accounts, transactions, credit cards, budgets, import).

| Module | Status | Notes |
|---|---|---|
| Backend stack & project scaffold | Done | TypeScript + NestJS + Drizzle ORM/drizzle-kit + Postgres (`pg`) + Jest + ESLint/Prettier. See Recent decisions log (2026-07-30). |
| Domain model & schema | In progress | Categories schema extended with `icon`/`color`/`type` (see `category.schema.ts`); no other entity's schema exists yet. |
| Categories CRUD (create/list/edit; delete stubbed) | Done | First real controller/service/DTO/guard in the repo — see `categories.controller.ts`, `categories.service.ts`. Delete returns `501` pending `architecture-decisions.md` Open Question 1. |
| AD-1 Derived ledger | Not started | |
| AD-2 Balance function + checkpoints | Not started | Pure derivation first, checkpoints deferred |
| AD-3 Tenant scoping | Not started | Must be present before any table is created |
| Transactions / installments / recurring | Not started | |
| Credit cards / invoices | Not started | |
| Budgets computation | Not started | |
| Import subsystem (CSV/PDF) | Not started | |
| **API contract published for `mybills-frontend`** | In progress | Categories CRUD documented in `api-contract.md` (create/list/edit live; delete stubbed pending Open Question 1); every other module still undocumented. |

**Open decisions blocking progress:** _(see Open Questions in `.claude/rules/architecture-decisions.md`)_

**Recent decisions log:**
- 2026-07-30 — Backend stack chosen: TypeScript (Node.js 22 LTS) + NestJS (Express adapter) + Drizzle ORM +
  drizzle-kit + `pg` (node-postgres) + Jest + ESLint/Prettier, over PostgreSQL with row-level security per AD-3.
  Considered and rejected Java/Spring Boot for now: its edge is JVM throughput/enterprise pedigree at high
  concurrent load, which this project doesn't need yet, while Nest's framework-enforced module boundaries are a
  better fit for keeping the modular monolith clean as it grows. Revisit only if this becomes a real
  multi-tenant SaaS under genuine concurrent load. Project scaffolded with module
  folders for accounts/ledger, transactions, credit-cards, budgets, categories, import, a Postgres connection
  module (`src/infra/database/`) including the AD-3 tenant-context seam, and no domain code yet.
- 2026-08-08 — First real HTTP endpoints shipped: Categories CRUD (create, list, edit; delete intentionally
  stubbed to 501 pending `architecture-decisions.md` Open Question 1). Establishes the first controller/service/
  DTO/guard/decorator pattern in the repo, for future modules to copy: `x-user-id` request header (validated as
  UUID) as the interim tenant-resolution mechanism via a global `UserIdGuard` + `@UserId()` param decorator,
  `class-validator`/`class-transformer` + a global `ValidationPipe`, and `@nestjs/swagger` wired in `main.ts`
  (`/api-docs`) per the Tier 3 plan in `api-contract.md`.

> **Cross-repo status:** this table only covers the backend. There is no single place that tracks
> backend+frontend+desktop+mobile progress together, because status now lives per-repo. If you want one, it'll
> need to live somewhere outside git (a project board, a shared doc) — nothing here does that automatically.

---

## 📁 Repository Structure

```
mybills-backend/
├── CLAUDE.md ← you are here
├── MyBills-Technical-Specification.md ← full product spec (mirrored — see note below)
├── .claude/
│  └── rules/
│  ├── README.md
│  ├── architecture-decisions.md ← mirrored from mybills-frontend, keep in sync
│  ├── domain-model.md ← mirrored from mybills-frontend, keep in sync
│  ├── api-contract.md ← THE coordination surface with mybills-frontend — see below
│  ├── ledger-and-balances.md
│  ├── transactions-and-recurrence.md
│  ├── credit-cards-and-invoices.md
│  ├── budgets-and-planning.md
│  ├── import-subsystem.md
│  └── security-and-multitenancy.md
├── src/
│  ├── main.ts, app.module.ts
│  ├── infra/database/ ← Postgres pool + Drizzle client + the AD-3 tenant-context seam
│  └── modules/ ← one folder per module seam: accounts, transactions, credit-cards, budgets,
│                  categories, import — currently empty Nest modules, no domain code yet
├── test/ ← Jest e2e scaffold (app boots); unit tests live next to their module once it has code
├── drizzle/ ← drizzle-kit migration output (empty until a schema exists)
├── drizzle.config.ts, package.json, tsconfig*.json, nest-cli.json, eslint.config.mjs, .prettierrc
└── .env.example
```

**Sibling repos:** `mybills-frontend` (web today; desktop/mobile planned as further separate repos once a stack
is chosen — see `api-contract.md` and `mybills-frontend`'s `cross-platform-strategy.md`).

**Why some files are duplicated.** Splitting backend and frontend into separate GitHub projects means a Claude
Code session in this repo cannot see `mybills-frontend`'s files, and vice versa. Content that's genuinely
true for both — the architecture decisions, the domain model/glossary, and the API contract between them — has
to be copied into both repos rather than referenced once from a shared root. **This is a real trade-off, not a
free win:** these mirrored files can drift if one repo's copy is updated without the other. Treat any edit to
`architecture-decisions.md`, `domain-model.md`, or `api-contract.md` in this repo as incomplete until the
matching edit is made in `mybills-frontend` too.

**Project is scaffolded; no domain code yet.** The module folders, lint/format config, test runner, and Postgres
connection module exist (see stack decision above), but no schema, entity, controller, or service code has been
written — every module under `src/modules/` is still an empty `@Module({})` placeholder.

```bash
npm install                # install dependencies
cp .env.example .env       # then point DATABASE_URL at a real Postgres instance
npm run start:dev          # run the API with hot reload
npm run build               # compile with tsc (nest build)
npm run lint                # eslint --fix over src/ and test/
npm test                    # jest unit tests (none yet — passes via --passWithNoTests)
npm run test:e2e            # jest e2e — boots the Nest app end-to-end
npm run db:generate         # drizzle-kit generate — once a module exports a *.schema.ts
npm run db:migrate          # drizzle-kit migrate
```

---

## What This Repo Owns

The **entire source of financial truth** for MyBills: schema, all derived-figure computation (balances, invoice
totals, budget actuals), tenant enforcement, and the import pipeline. It exposes a REST API — the contract in
`.claude/rules/api-contract.md` — consumed by `mybills-frontend` and, later, desktop/mobile clients, identically.

**The one rule above all others:** no screen, report, or query — anywhere, including inside this backend —
sums transactions on its own to produce a balance. Everything reads through `getAccountBalance(account, date,
{projected})`. Full detail: `.claude/rules/ledger-and-balances.md`.

---

## Working Agreement for Future Sessions

- **Any change that adds, removes, or changes an API endpoint or response shape must update
  `.claude/rules/api-contract.md` in *both* repos.** Since `mybills-frontend` can't see this codebase directly,
  the contract file is the only way it finds out what changed.
- Cross-cutting decisions (ADRs, domain model) get logged here *and* copied into `mybills-frontend`.
- Never let this backend expose different behavior to different clients — one API, served identically to web,
  desktop, and mobile.
- If a request would touch an open question in `architecture-decisions.md` without resolving it first, flag
  that before proceeding.
