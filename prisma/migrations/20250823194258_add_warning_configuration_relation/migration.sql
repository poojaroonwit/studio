/*
  Warnings:

  - You are about to drop the column `gradeId` on the `Candidate` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Candidate" DROP CONSTRAINT "Candidate_gradeId_fkey";

-- DropIndex
DROP INDEX "Candidate_gradeId_idx";

-- AlterTable
ALTER TABLE "Candidate" DROP COLUMN "gradeId";

-- AddForeignKey
ALTER TABLE "Warning" ADD CONSTRAINT "Warning_configuration_id_fkey" FOREIGN KEY ("configuration_id") REFERENCES "WarningConfiguration"("id") ON DELETE CASCADE ON UPDATE CASCADE;
