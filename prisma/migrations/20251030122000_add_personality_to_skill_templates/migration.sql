-- CreateTable
CREATE TABLE "SkillTemplatePersonalityGroup" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "templateId" UUID NOT NULL,
    "groupId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SkillTemplatePersonalityGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SkillTemplatePersonalityTrait" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "templateId" UUID NOT NULL,
    "traitId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SkillTemplatePersonalityTrait_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SkillTemplatePersonalityGroup_templateId_idx" ON "SkillTemplatePersonalityGroup"("templateId");

-- CreateIndex
CREATE INDEX "SkillTemplatePersonalityGroup_groupId_idx" ON "SkillTemplatePersonalityGroup"("groupId");

-- CreateIndex
CREATE UNIQUE INDEX "SkillTemplatePersonalityGroup_templateId_groupId_key" ON "SkillTemplatePersonalityGroup"("templateId", "groupId");

-- CreateIndex
CREATE INDEX "SkillTemplatePersonalityTrait_templateId_idx" ON "SkillTemplatePersonalityTrait"("templateId");

-- CreateIndex
CREATE INDEX "SkillTemplatePersonalityTrait_traitId_idx" ON "SkillTemplatePersonalityTrait"("traitId");

-- CreateIndex
CREATE UNIQUE INDEX "SkillTemplatePersonalityTrait_templateId_traitId_key" ON "SkillTemplatePersonalityTrait"("templateId", "traitId");

-- AddForeignKey
ALTER TABLE "SkillTemplatePersonalityGroup" ADD CONSTRAINT "SkillTemplatePersonalityGroup_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "SkillTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SkillTemplatePersonalityGroup" ADD CONSTRAINT "SkillTemplatePersonalityGroup_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "PersonalityGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SkillTemplatePersonalityTrait" ADD CONSTRAINT "SkillTemplatePersonalityTrait_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "SkillTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SkillTemplatePersonalityTrait" ADD CONSTRAINT "SkillTemplatePersonalityTrait_traitId_fkey" FOREIGN KEY ("traitId") REFERENCES "PersonalityTrait"("id") ON DELETE CASCADE ON UPDATE CASCADE;

