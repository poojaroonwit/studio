-- CreateTable
CREATE TABLE "SystemApiKey" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "description" TEXT,
    "key_prefix" TEXT NOT NULL,
    "key_hash" TEXT NOT NULL,
    "permissions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "role" TEXT NOT NULL DEFAULT 'api_user',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "expires_at" TIMESTAMP(3),
    "last_used_at" TIMESTAMP(3),
    "last_used_ip" TEXT,
    "usage_count" INTEGER NOT NULL DEFAULT 0,
    "created_by_id" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemApiKey_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SystemApiKey_key_hash_key" ON "SystemApiKey"("key_hash");

-- CreateIndex
CREATE INDEX "SystemApiKey_key_hash_idx" ON "SystemApiKey"("key_hash");

-- CreateIndex
CREATE INDEX "SystemApiKey_is_active_idx" ON "SystemApiKey"("is_active");

-- CreateIndex
CREATE INDEX "SystemApiKey_expires_at_idx" ON "SystemApiKey"("expires_at");

-- CreateIndex
CREATE INDEX "SystemApiKey_created_by_id_idx" ON "SystemApiKey"("created_by_id");
