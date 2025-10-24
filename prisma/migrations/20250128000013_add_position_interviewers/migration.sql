-- CreateTable
CREATE TABLE "PositionInterviewer" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "positionId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" UUID,

    CONSTRAINT "PositionInterviewer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PositionInterviewer_positionId_userId_key" ON "PositionInterviewer"("positionId", "userId");

-- CreateIndex
CREATE INDEX "PositionInterviewer_positionId_idx" ON "PositionInterviewer"("positionId");

-- CreateIndex
CREATE INDEX "PositionInterviewer_userId_idx" ON "PositionInterviewer"("userId");

-- AddForeignKey
ALTER TABLE "PositionInterviewer" ADD CONSTRAINT "PositionInterviewer_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "Position"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PositionInterviewer" ADD CONSTRAINT "PositionInterviewer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PositionInterviewer" ADD CONSTRAINT "PositionInterviewer_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
