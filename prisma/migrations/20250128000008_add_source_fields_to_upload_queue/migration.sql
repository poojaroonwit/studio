-- AlterTable
ALTER TABLE "upload_queue" ADD COLUMN IF NOT EXISTS "source_id" UUID;
ALTER TABLE "upload_queue" ADD COLUMN IF NOT EXISTS "sub_source" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "upload_queue_source_id_idx" ON "upload_queue"("source_id");

-- AddForeignKey
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables t
    WHERE t.table_schema = 'public' AND t.table_name = 'applicantSource'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints tc
      WHERE tc.table_schema = 'public' AND tc.table_name = 'upload_queue' AND tc.constraint_name = 'upload_queue_source_id_fkey'
    ) THEN
      ALTER TABLE "upload_queue" ADD CONSTRAINT "upload_queue_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "applicantSource"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
  END IF;
END$$;
