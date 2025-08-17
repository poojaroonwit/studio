/*
  Warnings:

  - A unique constraint covering the columns `[model_name,field_code]` on the table `CustomFieldDefinition` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `field_code` to the `CustomFieldDefinition` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "CustomFieldDefinition" ADD COLUMN     "field_code" TEXT NOT NULL,
ADD COLUMN     "show_in_headcount_detail" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE UNIQUE INDEX "CustomFieldDefinition_model_name_field_code_key" ON "CustomFieldDefinition"("model_name", "field_code");
