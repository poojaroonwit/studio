-- Add isActive field to User table
ALTER TABLE "User" ADD COLUMN "is_active" BOOLEAN NOT NULL DEFAULT true;

-- Create index for better query performance
CREATE INDEX "User_is_active_idx" ON "User"("is_active");
