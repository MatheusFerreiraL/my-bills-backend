-- Custom SQL migration file, put your code below! --

-- AD-3: ENABLE ROW LEVEL SECURITY (emitted by Drizzle's .enableRLS() in 0000) is not enough on
-- its own — a table's owning role (the role the app connects as) bypasses RLS by default unless
-- the table is also set to FORCE it. Drizzle's schema API has no equivalent for FORCE, so it's
-- added here by hand, once per table, covering all 14 tenant-scoped tables.
ALTER TABLE "accounts" FORCE ROW LEVEL SECURITY;
ALTER TABLE "budgets" FORCE ROW LEVEL SECURITY;
ALTER TABLE "category_budgets" FORCE ROW LEVEL SECURITY;
ALTER TABLE "savings_envelopes" FORCE ROW LEVEL SECURITY;
ALTER TABLE "categories" FORCE ROW LEVEL SECURITY;
ALTER TABLE "card_transactions" FORCE ROW LEVEL SECURITY;
ALTER TABLE "credit_cards" FORCE ROW LEVEL SECURITY;
ALTER TABLE "invoices" FORCE ROW LEVEL SECURITY;
ALTER TABLE "import_batches" FORCE ROW LEVEL SECURITY;
ALTER TABLE "installment_plans" FORCE ROW LEVEL SECURITY;
ALTER TABLE "recurrence_rules" FORCE ROW LEVEL SECURITY;
ALTER TABLE "tags" FORCE ROW LEVEL SECURITY;
ALTER TABLE "transaction_tags" FORCE ROW LEVEL SECURITY;
ALTER TABLE "transactions" FORCE ROW LEVEL SECURITY;
