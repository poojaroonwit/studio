-- AlterTable
ALTER TABLE "Candidate" ADD COLUMN     "gradeId" UUID;

-- CreateIndex
CREATE INDEX "Candidate_gradeId_idx" ON "Candidate"("gradeId");

-- AddForeignKey
ALTER TABLE "Candidate" ADD CONSTRAINT "Candidate_gradeId_fkey" FOREIGN KEY ("gradeId") REFERENCES "Grade"("id") ON DELETE SET NULL ON UPDATE CASCADE;
