CREATE TYPE "public"."budget_period_type" AS ENUM('monthly', 'custom');--> statement-breakpoint
CREATE TYPE "public"."invoice_status" AS ENUM('open', 'closed', 'paid');--> statement-breakpoint
CREATE TYPE "public"."import_batch_status" AS ENUM('parsing', 'review', 'committed', 'reversed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."import_source_type" AS ENUM('csv', 'pdf');--> statement-breakpoint
CREATE TYPE "public"."recurrence_frequency" AS ENUM('monthly');--> statement-breakpoint
CREATE TYPE "public"."transaction_status" AS ENUM('paid', 'pending');--> statement-breakpoint
CREATE TYPE "public"."transaction_type" AS ENUM('income', 'expense');--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"bank_logo" varchar(512),
	"initial_balance_minor" bigint NOT NULL,
	"currency_code" varchar(3) DEFAULT 'EUR' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "accounts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "budgets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"period_type" "budget_period_type" NOT NULL,
	"period_start" date NOT NULL,
	"period_end" date NOT NULL,
	"planned_income_minor" bigint NOT NULL,
	"currency_code" varchar(3) DEFAULT 'EUR' NOT NULL,
	"savings_percent" numeric(5, 2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "budgets" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "category_budgets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"budget_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	"limit_minor" bigint,
	"currency_code" varchar(3),
	"limit_percent" numeric(5, 2),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "category_budgets" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "savings_envelopes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"budget_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"allocation_minor" bigint NOT NULL,
	"currency_code" varchar(3) DEFAULT 'EUR' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "savings_envelopes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "categories" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "card_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"invoice_id" uuid NOT NULL,
	"category_id" uuid,
	"date" date NOT NULL,
	"amount_minor" bigint NOT NULL,
	"currency_code" varchar(3) DEFAULT 'EUR' NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "card_transactions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "credit_cards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"credit_limit_minor" bigint NOT NULL,
	"currency_code" varchar(3) DEFAULT 'EUR' NOT NULL,
	"closing_day" integer NOT NULL,
	"due_day" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "credit_cards" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"credit_card_id" uuid NOT NULL,
	"cycle_start" date NOT NULL,
	"cycle_end" date NOT NULL,
	"due_date" date NOT NULL,
	"status" "invoice_status" DEFAULT 'open' NOT NULL,
	"settled_transaction_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "invoices" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "import_batches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"source_type" "import_source_type" NOT NULL,
	"original_filename" varchar(512) NOT NULL,
	"account_id" uuid,
	"credit_card_id" uuid,
	"bank_profile_id" uuid,
	"row_count" integer DEFAULT 0 NOT NULL,
	"imported_count" integer DEFAULT 0 NOT NULL,
	"skipped_count" integer DEFAULT 0 NOT NULL,
	"status" "import_batch_status" DEFAULT 'parsing' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "import_batches" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "installment_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"description" varchar(255) NOT NULL,
	"total_installments" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "installment_plans" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "recurrence_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"description" varchar(255) NOT NULL,
	"frequency" "recurrence_frequency" DEFAULT 'monthly' NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date,
	"occurrence_count" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "recurrence_rules" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "tags" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "transaction_tags" (
	"user_id" uuid NOT NULL,
	"transaction_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "transaction_tags_transaction_id_tag_id_pk" PRIMARY KEY("transaction_id","tag_id")
);
--> statement-breakpoint
ALTER TABLE "transaction_tags" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"category_id" uuid,
	"type" "transaction_type" NOT NULL,
	"status" "transaction_status" NOT NULL,
	"date" date NOT NULL,
	"amount_minor" bigint NOT NULL,
	"currency_code" varchar(3) DEFAULT 'EUR' NOT NULL,
	"description" varchar(255),
	"is_fixed" boolean DEFAULT false NOT NULL,
	"is_ignored" boolean DEFAULT false NOT NULL,
	"installment_plan_id" uuid,
	"recurrence_rule_id" uuid,
	"import_batch_id" uuid,
	"fingerprint" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "transactions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "category_budgets" ADD CONSTRAINT "category_budgets_budget_id_budgets_id_fk" FOREIGN KEY ("budget_id") REFERENCES "public"."budgets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "category_budgets" ADD CONSTRAINT "category_budgets_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "savings_envelopes" ADD CONSTRAINT "savings_envelopes_budget_id_budgets_id_fk" FOREIGN KEY ("budget_id") REFERENCES "public"."budgets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "card_transactions" ADD CONSTRAINT "card_transactions_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "card_transactions" ADD CONSTRAINT "card_transactions_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_credit_card_id_credit_cards_id_fk" FOREIGN KEY ("credit_card_id") REFERENCES "public"."credit_cards"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_settled_transaction_id_transactions_id_fk" FOREIGN KEY ("settled_transaction_id") REFERENCES "public"."transactions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_batches" ADD CONSTRAINT "import_batches_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_batches" ADD CONSTRAINT "import_batches_credit_card_id_credit_cards_id_fk" FOREIGN KEY ("credit_card_id") REFERENCES "public"."credit_cards"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction_tags" ADD CONSTRAINT "transaction_tags_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction_tags" ADD CONSTRAINT "transaction_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_installment_plan_id_installment_plans_id_fk" FOREIGN KEY ("installment_plan_id") REFERENCES "public"."installment_plans"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_recurrence_rule_id_recurrence_rules_id_fk" FOREIGN KEY ("recurrence_rule_id") REFERENCES "public"."recurrence_rules"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_import_batch_id_import_batches_id_fk" FOREIGN KEY ("import_batch_id") REFERENCES "public"."import_batches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "accounts_user_id_idx" ON "accounts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "budgets_user_id_idx" ON "budgets" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "category_budgets_user_id_idx" ON "category_budgets" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "category_budgets_budget_id_idx" ON "category_budgets" USING btree ("budget_id");--> statement-breakpoint
CREATE INDEX "savings_envelopes_user_id_idx" ON "savings_envelopes" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "savings_envelopes_budget_id_idx" ON "savings_envelopes" USING btree ("budget_id");--> statement-breakpoint
CREATE INDEX "categories_user_id_idx" ON "categories" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "card_transactions_user_id_idx" ON "card_transactions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "card_transactions_invoice_id_idx" ON "card_transactions" USING btree ("invoice_id");--> statement-breakpoint
CREATE INDEX "credit_cards_user_id_idx" ON "credit_cards" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "invoices_user_id_idx" ON "invoices" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "invoices_credit_card_id_idx" ON "invoices" USING btree ("credit_card_id");--> statement-breakpoint
CREATE INDEX "import_batches_user_id_idx" ON "import_batches" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "installment_plans_user_id_idx" ON "installment_plans" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "recurrence_rules_user_id_idx" ON "recurrence_rules" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "tags_user_id_idx" ON "tags" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "transaction_tags_user_id_idx" ON "transaction_tags" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "transactions_user_id_idx" ON "transactions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "transactions_account_id_idx" ON "transactions" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "transactions_category_id_idx" ON "transactions" USING btree ("category_id");--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "accounts" AS PERMISSIVE FOR ALL TO public USING ("accounts"."user_id" = current_setting('app.current_user_id', true)::uuid) WITH CHECK ("accounts"."user_id" = current_setting('app.current_user_id', true)::uuid);--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "budgets" AS PERMISSIVE FOR ALL TO public USING ("budgets"."user_id" = current_setting('app.current_user_id', true)::uuid) WITH CHECK ("budgets"."user_id" = current_setting('app.current_user_id', true)::uuid);--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "category_budgets" AS PERMISSIVE FOR ALL TO public USING ("category_budgets"."user_id" = current_setting('app.current_user_id', true)::uuid) WITH CHECK ("category_budgets"."user_id" = current_setting('app.current_user_id', true)::uuid);--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "savings_envelopes" AS PERMISSIVE FOR ALL TO public USING ("savings_envelopes"."user_id" = current_setting('app.current_user_id', true)::uuid) WITH CHECK ("savings_envelopes"."user_id" = current_setting('app.current_user_id', true)::uuid);--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "categories" AS PERMISSIVE FOR ALL TO public USING ("categories"."user_id" = current_setting('app.current_user_id', true)::uuid) WITH CHECK ("categories"."user_id" = current_setting('app.current_user_id', true)::uuid);--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "card_transactions" AS PERMISSIVE FOR ALL TO public USING ("card_transactions"."user_id" = current_setting('app.current_user_id', true)::uuid) WITH CHECK ("card_transactions"."user_id" = current_setting('app.current_user_id', true)::uuid);--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "credit_cards" AS PERMISSIVE FOR ALL TO public USING ("credit_cards"."user_id" = current_setting('app.current_user_id', true)::uuid) WITH CHECK ("credit_cards"."user_id" = current_setting('app.current_user_id', true)::uuid);--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "invoices" AS PERMISSIVE FOR ALL TO public USING ("invoices"."user_id" = current_setting('app.current_user_id', true)::uuid) WITH CHECK ("invoices"."user_id" = current_setting('app.current_user_id', true)::uuid);--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "import_batches" AS PERMISSIVE FOR ALL TO public USING ("import_batches"."user_id" = current_setting('app.current_user_id', true)::uuid) WITH CHECK ("import_batches"."user_id" = current_setting('app.current_user_id', true)::uuid);--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "installment_plans" AS PERMISSIVE FOR ALL TO public USING ("installment_plans"."user_id" = current_setting('app.current_user_id', true)::uuid) WITH CHECK ("installment_plans"."user_id" = current_setting('app.current_user_id', true)::uuid);--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "recurrence_rules" AS PERMISSIVE FOR ALL TO public USING ("recurrence_rules"."user_id" = current_setting('app.current_user_id', true)::uuid) WITH CHECK ("recurrence_rules"."user_id" = current_setting('app.current_user_id', true)::uuid);--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "tags" AS PERMISSIVE FOR ALL TO public USING ("tags"."user_id" = current_setting('app.current_user_id', true)::uuid) WITH CHECK ("tags"."user_id" = current_setting('app.current_user_id', true)::uuid);--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "transaction_tags" AS PERMISSIVE FOR ALL TO public USING ("transaction_tags"."user_id" = current_setting('app.current_user_id', true)::uuid) WITH CHECK ("transaction_tags"."user_id" = current_setting('app.current_user_id', true)::uuid);--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "transactions" AS PERMISSIVE FOR ALL TO public USING ("transactions"."user_id" = current_setting('app.current_user_id', true)::uuid) WITH CHECK ("transactions"."user_id" = current_setting('app.current_user_id', true)::uuid);