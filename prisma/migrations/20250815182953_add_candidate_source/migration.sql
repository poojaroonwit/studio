-- AlterTable
ALTER TABLE "Candidate" ADD COLUMN     "sourceId" UUID,
ADD COLUMN     "subSource" TEXT;

-- CreateTable
CREATE TABLE "CandidateSource" (
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
CREATE UNIQUE INDEX "CandidateSource_name_key" ON "CandidateSource"("name");

-- CreateIndex
CREATE INDEX "CandidateSource_sort_order_idx" ON "CandidateSource"("sort_order");

-- CreateIndex
CREATE INDEX "CandidateSource_is_active_idx" ON "CandidateSource"("is_active");

-- CreateIndex
CREATE INDEX "Candidate_sourceId_idx" ON "Candidate"("sourceId");

-- AddForeignKey
ALTER TABLE "Candidate" ADD CONSTRAINT "Candidate_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "CandidateSource"("id") ON DELETE SET NULL ON UPDATE CASCADE;
