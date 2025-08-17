-- AlterTable
ALTER TABLE "CandidateSource" ADD COLUMN     "logo" TEXT;

-- AlterTable
ALTER TABLE "CustomFieldDefinition" ADD COLUMN     "allow_custom_options" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "attribute_code" TEXT,
ADD COLUMN     "attribute_label" TEXT,
ADD COLUMN     "edit_roles" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "show_in_candidate_detail" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "show_in_filter" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "show_in_full_candidate_detail" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "show_in_position_settings" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "show_in_task_board_filter" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "view_roles" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateTable
CREATE TABLE "CustomFieldOption" (
    "id" UUID NOT NULL,
    "custom_field_definition_id" UUID NOT NULL,
    "value" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "color" TEXT DEFAULT '#3B82F6',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomFieldOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "data" JSONB DEFAULT '{}',
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CustomFieldOption_custom_field_definition_id_idx" ON "CustomFieldOption"("custom_field_definition_id");

-- CreateIndex
CREATE INDEX "CustomFieldOption_sort_order_idx" ON "CustomFieldOption"("sort_order");

-- CreateIndex
CREATE INDEX "CustomFieldOption_is_active_idx" ON "CustomFieldOption"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "CustomFieldOption_custom_field_definition_id_value_key" ON "CustomFieldOption"("custom_field_definition_id", "value");

-- CreateIndex
CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");

-- CreateIndex
CREATE INDEX "Notification_isRead_idx" ON "Notification"("isRead");

-- CreateIndex
CREATE INDEX "Notification_createdAt_idx" ON "Notification"("createdAt");

-- CreateIndex
CREATE INDEX "Notification_type_idx" ON "Notification"("type");

-- CreateIndex
CREATE INDEX "CustomFieldDefinition_view_roles_idx" ON "CustomFieldDefinition"("view_roles");

-- CreateIndex
CREATE INDEX "CustomFieldDefinition_edit_roles_idx" ON "CustomFieldDefinition"("edit_roles");

-- AddForeignKey
ALTER TABLE "CustomFieldOption" ADD CONSTRAINT "CustomFieldOption_custom_field_definition_id_fkey" FOREIGN KEY ("custom_field_definition_id") REFERENCES "CustomFieldDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
