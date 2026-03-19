/*
  Warnings:

  - You are about to drop the column `admin_snapshot` on the `pickup_point_log` table. All the data in the column will be lost.
  - You are about to drop the column `pickup_point_snapshot` on the `pickup_point_log` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "pickup_point" ALTER COLUMN "phones" DROP DEFAULT,
ALTER COLUMN "emails" DROP DEFAULT;

-- AlterTable
ALTER TABLE "pickup_point_log" DROP COLUMN "admin_snapshot",
DROP COLUMN "pickup_point_snapshot",
ADD COLUMN     "adminSnapshot" JSONB,
ADD COLUMN     "pickupPointSnapshot" JSONB;
