-- Create a table to track warning system initialization
CREATE TABLE IF NOT EXISTS "WarningSystemStatus" (
    "id" TEXT NOT NULL,
    "initialized" BOOLEAN NOT NULL DEFAULT false,
    "initializedAt" TIMESTAMP(3),
    "lastCheckAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WarningSystemStatus_pkey" PRIMARY KEY ("id")
);

-- Insert default record
INSERT INTO "WarningSystemStatus" ("id", "initialized", "createdAt", "updatedAt") 
VALUES ('system', false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;
