-- AlterTable
ALTER TABLE "WarningConfiguration" ADD COLUMN     "warning_level" TEXT NOT NULL DEFAULT 'medium';

-- CreateIndex
CREATE INDEX "WarningConfiguration_warning_level_idx" ON "WarningConfiguration"("warning_level");
