-- CreateTable
CREATE TABLE "Webhook" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "headers" JSONB,
    "authType" TEXT,
    "authData" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Webhook_pkey" PRIMARY KEY ("id")
);
