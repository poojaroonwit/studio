-- CreateTable
CREATE TABLE "SystemPrompt" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "content" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemPrompt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SystemPrompt_name_idx" ON "SystemPrompt"("name");

-- CreateIndex
CREATE INDEX "SystemPrompt_category_idx" ON "SystemPrompt"("category");

-- CreateIndex
CREATE INDEX "SystemPrompt_is_active_idx" ON "SystemPrompt"("is_active");

-- CreateIndex
CREATE INDEX "SystemPrompt_created_at_idx" ON "SystemPrompt"("created_at");
