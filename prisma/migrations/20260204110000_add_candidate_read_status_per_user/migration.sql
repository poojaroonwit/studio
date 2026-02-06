-- CreateTable
CREATE TABLE "applicant_read_status" (
    "id" UUID NOT NULL,
    "applicant_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "applicant_read_status_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "applicant_read_status_applicant_id_idx" ON "applicant_read_status"("applicant_id");

-- CreateIndex
CREATE INDEX "applicant_read_status_user_id_idx" ON "applicant_read_status"("user_id");

-- CreateIndex
CREATE INDEX "applicant_read_status_is_read_idx" ON "applicant_read_status"("is_read");

-- CreateIndex
CREATE UNIQUE INDEX "applicant_read_status_applicant_id_user_id_key" ON "applicant_read_status"("applicant_id", "user_id");

-- AddForeignKey
ALTER TABLE "applicant_read_status" ADD CONSTRAINT "applicant_read_status_applicant_id_fkey" FOREIGN KEY ("applicant_id") REFERENCES "applicant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applicant_read_status" ADD CONSTRAINT "applicant_read_status_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
