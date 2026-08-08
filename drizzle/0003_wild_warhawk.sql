CREATE TYPE "public"."category_type" AS ENUM('expense', 'income');--> statement-breakpoint
ALTER TABLE "categories" ADD COLUMN "icon" varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE "categories" ADD COLUMN "color" varchar(7) NOT NULL;--> statement-breakpoint
ALTER TABLE "categories" ADD COLUMN "type" "category_type" NOT NULL;