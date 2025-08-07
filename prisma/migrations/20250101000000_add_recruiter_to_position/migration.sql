-- AlterTable
ALTER TABLE "Position" ADD COLUMN "recruiterId" UUID;

-- CreateIndex
CREATE INDEX "Position_recruiterId_idx" ON "Position"("recruiterId");

-- AddForeignKey
ALTER TABLE "Position" ADD CONSTRAINT "Position_recruiterId_fkey" FOREIGN KEY ("recruiterId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE; 