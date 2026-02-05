-- CreateTable
CREATE TABLE "candidate_read_status" (
    "id" UUID NOT NULL,
    "candidate_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "candidate_read_status_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "candidate_read_status_candidate_id_idx" ON "candidate_read_status"("candidate_id");

-- CreateIndex
CREATE INDEX "candidate_read_status_user_id_idx" ON "candidate_read_status"("user_id");

-- CreateIndex
CREATE INDEX "candidate_read_status_is_read_idx" ON "candidate_read_status"("is_read");

-- CreateIndex
CREATE UNIQUE INDEX "candidate_read_status_candidate_id_user_id_key" ON "candidate_read_status"("candidate_id", "user_id");

-- AddForeignKey
ALTER TABLE "candidate_read_status" ADD CONSTRAINT "candidate_read_status_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_read_status" ADD CONSTRAINT "candidate_read_status_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
