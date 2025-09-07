-- AlterTable
ALTER TABLE "Attachment" ADD COLUMN IF NOT EXISTS "headcountId" UUID;
ALTER TABLE "Attachment" ALTER COLUMN "candidateId" DROP NOT NULL;

-- CreateTable
CREATE TABLE IF NOT EXISTS "Headcount" (
    "id" UUID NOT NULL,
    "positionId" UUID NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'new',
    "status" TEXT NOT NULL DEFAULT 'vacant',
    "candidateId" UUID,
    "onboardingDate" TIMESTAMP(3),
    "notes" TEXT,
    "memo_id" TEXT,
    "custom_fields" JSONB DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Headcount_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Headcount_positionId_idx" ON "Headcount"("positionId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Headcount_candidateId_idx" ON "Headcount"("candidateId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Headcount_type_idx" ON "Headcount"("type");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Headcount_status_idx" ON "Headcount"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Attachment_headcountId_idx" ON "Attachment"("headcountId");

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    WHERE tc.table_schema = 'public' AND tc.table_name = 'Attachment' AND tc.constraint_name = 'Attachment_headcountId_fkey'
  ) THEN
    ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_headcountId_fkey" FOREIGN KEY ("headcountId") REFERENCES "Headcount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END$$;

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    WHERE tc.table_schema = 'public' AND tc.table_name = 'Headcount' AND tc.constraint_name = 'Headcount_positionId_fkey'
  ) THEN
    ALTER TABLE "Headcount" ADD CONSTRAINT "Headcount_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "Position"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END$$;

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    WHERE tc.table_schema = 'public' AND tc.table_name = 'Headcount' AND tc.constraint_name = 'Headcount_candidateId_fkey'
  ) THEN
    ALTER TABLE "Headcount" ADD CONSTRAINT "Headcount_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END$$;
