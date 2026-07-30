#.claude/rules/ — How This Is Organized

Claude Code discovers every `.md` file under `.claude/rules/` recursively and loads it automatically. A
`paths:` frontmatter field would scope a rule to only load for matching files — **none of the files in this repo
use it right now**, because the whole repo is already one side of the product (backend). Path-scoping becomes
useful again once this repo grows internal module folders (e.g. `src/modules/ledger/`, `src/modules/import/`) —
at that point, consider adding `paths:` to the more specific rule files so e.g. the import-subsystem rule only
loads while touching import code.

## Files in this folder

| File | Scope | Mirrored? |
|---|---|---|
| `README.md` | this file | own copy, not mirrored |
| `architecture-decisions.md` | AD-1..AD-6, open questions — true for the whole product | **mirrored** from `mybills-frontend` |
| `domain-model.md` | ERD, entities, glossary, cross-cutting conventions | **mirrored** from `mybills-frontend` |
| `api-contract.md` | the REST contract between this repo and `mybills-frontend` | **mirrored** from `mybills-frontend` |
| `ledger-and-balances.md` | AD-1/AD-2 implementation detail | backend-only, no mirror |
| `transactions-and-recurrence.md` | AD-5 implementation detail | backend-only, no mirror |
| `credit-cards-and-invoices.md` | invoice/card model | backend-only, no mirror |
| `budgets-and-planning.md` | budget computation | backend-only, no mirror |
| `import-subsystem.md` | CSV/PDF pipeline | backend-only, no mirror |
| `security-and-multitenancy.md` | AD-3/AD-4, uploaded-file handling | backend-only, no mirror |

## The mirroring trade-off (read this before editing a mirrored file)

This repo and `mybills-frontend` are separate GitHub projects. A Claude Code session working in one cannot see
the other's files. That means content genuinely true for the whole product — the ADRs, the domain model and
glossary, and the API contract — has to exist as a **duplicated copy in both repos** rather than a single
shared source.

**This is a real cost, not a formality:**
- If you change something in a mirrored file here, the same change needs to be made in `mybills-frontend`'s
  copy, by hand, in a separate step. Nothing automates this today.
- If the two copies ever disagree, there's no built-in way to tell which one is "right" — treat a discrepancy as
  a bug to resolve by comparing both, not as a reason to trust one repo's copy over the other by default.
- If this drift becomes a recurring problem, the fix is process, not more files: e.g. keep the technical spec
  and these three mirrored rule files in a small third repo or shared package that both `mybills-backend` and
  `mybills-frontend` pull in (as a git submodule, a published internal package, or simply a doc both maintainers
  check before merging). That's a decision to make deliberately if/when it's warranted — not built preemptively
  here.

## Adding a new rule

1. Decide: is this true for the whole product (→ add to / extend a mirrored file, and copy the change to the
  other repo), or specific to backend implementation (→ add to or extend a backend-only file here)?
2. If it changes the API surface between backend and frontend, it belongs in `api-contract.md` — in both repos.
3. If it changes the root `CLAUDE.md` status tracker, update that too.
