-- AlterTable
ALTER TABLE "Candidate" ADD COLUMN IF NOT EXISTS "sourceId" UUID;
ALTER TABLE "Candidate" ADD COLUMN IF NOT EXISTS "subSource" TEXT;

-- CreateTable
CREATE TABLE IF NOT EXISTS "CandidateSource" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "allow_sub_source" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CandidateSource_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "CandidateSource_name_key" ON "CandidateSource"("name");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "CandidateSource_sort_order_idx" ON "CandidateSource"("sort_order");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "CandidateSource_is_active_idx" ON "CandidateSource"("is_active");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Candidate_sourceId_idx" ON "Candidate"("sourceId");

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    WHERE tc.table_schema = 'public' AND tc.table_name = 'Candidate' AND tc.constraint_name = 'Candidate_sourceId_fkey'
  ) THEN
    ALTER TABLE "Candidate" ADD CONSTRAINT "Candidate_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "CandidateSource"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END$$;
