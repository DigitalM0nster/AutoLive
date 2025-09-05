/*
  Warnings:

  - The values [multi] on the enum `FilterType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "public"."FilterType_new" AS ENUM ('select', 'multi_select', 'range', 'boolean');
ALTER TABLE "public"."filter" ALTER COLUMN "type" DROP DEFAULT;
ALTER TABLE "public"."filter" ALTER COLUMN "type" TYPE "public"."FilterType_new" USING ("type"::text::"public"."FilterType_new");
ALTER TYPE "public"."FilterType" RENAME TO "FilterType_old";
ALTER TYPE "public"."FilterType_new" RENAME TO "FilterType";
DROP TYPE "public"."FilterType_old";
ALTER TABLE "public"."filter" ALTER COLUMN "type" SET DEFAULT 'select';
COMMIT;

-- AlterTable
CREATE SEQUENCE "public".__drizzle_migrations_id_seq;
ALTER TABLE "public"."__drizzle_migrations" ALTER COLUMN "id" SET DEFAULT nextval('"public".__drizzle_migrations_id_seq');
ALTER SEQUENCE "public".__drizzle_migrations_id_seq OWNED BY "public"."__drizzle_migrations"."id";

-- AlterTable
ALTER TABLE "public"."product_log" ADD COLUMN     "import_log_id" INTEGER;
