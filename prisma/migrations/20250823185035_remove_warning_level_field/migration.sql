/*
  Warnings:

  - You are about to drop the column `warning_level` on the `WarningConfiguration` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "WarningConfiguration_warning_level_idx";

-- AlterTable
ALTER TABLE "WarningConfiguration" DROP COLUMN "warning_level";
