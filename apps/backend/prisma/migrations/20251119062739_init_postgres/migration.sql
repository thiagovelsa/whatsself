-- CreateEnum
CREATE TYPE "MessageDirection" AS ENUM ('inbound', 'outbound');

-- CreateEnum
CREATE TYPE "MessageStatus" AS ENUM ('queued', 'sent', 'failed', 'delivered', 'read');

-- CreateEnum
CREATE TYPE "FlowStatus" AS ENUM ('draft', 'published', 'archived');

-- CreateEnum
CREATE TYPE "StepType" AS ENUM ('send_template', 'collect_input', 'end');

-- CreateEnum
CREATE TYPE "TriggerType" AS ENUM ('equals', 'contains', 'regex', 'number');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('admin', 'operator');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'operator',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contact" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "name" TEXT,
    "optIn" BOOLEAN NOT NULL DEFAULT true,
    "optedOut" BOOLEAN NOT NULL DEFAULT false,
    "welcomeSent" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Template" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "variables" JSONB,
    "variants" JSONB,
    "locale" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Template_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Trigger" (
    "id" TEXT NOT NULL,
    "type" "TriggerType" NOT NULL,
    "pattern" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "cooldownSec" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "templateId" TEXT,
    "flowId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Trigger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Flow" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "FlowStatus" NOT NULL DEFAULT 'draft',
    "version" INTEGER NOT NULL DEFAULT 1,
    "schemaJson" JSONB,
    "entryTriggerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Flow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FlowStep" (
    "id" TEXT NOT NULL,
    "flowId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "type" "StepType" NOT NULL,
    "templateId" TEXT,
    "waitInput" BOOLEAN NOT NULL DEFAULT false,
    "transitionsJson" JSONB,
    "order" INTEGER NOT NULL DEFAULT 0,
    "uiMetadataJson" JSONB,

    CONSTRAINT "FlowStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FlowInstance" (
    "id" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "flowId" TEXT NOT NULL,
    "currentStepKey" TEXT NOT NULL,
    "stateJson" JSONB,
    "lastInteractionAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paused" BOOLEAN NOT NULL DEFAULT false,
    "lockedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FlowInstance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "direction" "MessageDirection" NOT NULL,
    "status" "MessageStatus" NOT NULL,
    "content" TEXT NOT NULL,
    "triggerId" TEXT,
    "flowInstanceId" TEXT,
    "templateId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemConfig" (
    "id" TEXT NOT NULL DEFAULT 'global',
    "jwtSecretEncrypted" TEXT,
    "defaultAdminEmail" TEXT NOT NULL,
    "defaultAdminPasswordEncrypted" TEXT,
    "skipWhatsapp" BOOLEAN NOT NULL DEFAULT false,
    "puppeteerExecutablePath" TEXT,
    "rateMaxPerMin" INTEGER NOT NULL DEFAULT 12,
    "ratePerContactPer5Min" INTEGER NOT NULL DEFAULT 2,
    "businessHoursStart" TEXT NOT NULL DEFAULT '09:00',
    "businessHoursEnd" TEXT NOT NULL DEFAULT '18:00',
    "timezone" TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
    "wsPort" INTEGER NOT NULL DEFAULT 3001,
    "wsPath" TEXT NOT NULL DEFAULT '/socket.io',
    "humanizerMinDelayMs" INTEGER NOT NULL DEFAULT 3000,
    "humanizerMaxDelayMs" INTEGER NOT NULL DEFAULT 7000,
    "humanizerMinTypingMs" INTEGER NOT NULL DEFAULT 1500,
    "humanizerMaxTypingMs" INTEGER NOT NULL DEFAULT 3500,
    "cbWindowMode" TEXT NOT NULL DEFAULT '5m_or_50',
    "cbMinAttempts" INTEGER NOT NULL DEFAULT 20,
    "cbFailRateOpen" DOUBLE PRECISION NOT NULL DEFAULT 0.25,
    "cbProbeIntervalSec" INTEGER NOT NULL DEFAULT 45,
    "cbProbeSuccessClose" DOUBLE PRECISION NOT NULL DEFAULT 0.9,
    "cbProbeSamples" INTEGER NOT NULL DEFAULT 10,
    "cbCooldownInitialSec" INTEGER NOT NULL DEFAULT 300,
    "cbCooldownMaxSec" INTEGER NOT NULL DEFAULT 1800,
    "windowsTempDir" TEXT,
    "windowsLongPathSupport" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConfigAudit" (
    "id" TEXT NOT NULL,
    "actorUserId" TEXT,
    "changes" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "configId" TEXT NOT NULL,

    CONSTRAINT "ConfigAudit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Contact_phone_key" ON "Contact"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "Template_key_key" ON "Template"("key");

-- CreateIndex
CREATE UNIQUE INDEX "Flow_entryTriggerId_key" ON "Flow"("entryTriggerId");

-- CreateIndex
CREATE INDEX "Message_createdAt_idx" ON "Message"("createdAt");

-- CreateIndex
CREATE INDEX "Message_status_idx" ON "Message"("status");

-- CreateIndex
CREATE INDEX "Message_direction_idx" ON "Message"("direction");

-- AddForeignKey
ALTER TABLE "Trigger" ADD CONSTRAINT "Trigger_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "Template"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trigger" ADD CONSTRAINT "Trigger_flowId_fkey" FOREIGN KEY ("flowId") REFERENCES "Flow"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Flow" ADD CONSTRAINT "Flow_entryTriggerId_fkey" FOREIGN KEY ("entryTriggerId") REFERENCES "Trigger"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlowStep" ADD CONSTRAINT "FlowStep_flowId_fkey" FOREIGN KEY ("flowId") REFERENCES "Flow"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlowStep" ADD CONSTRAINT "FlowStep_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "Template"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlowInstance" ADD CONSTRAINT "FlowInstance_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlowInstance" ADD CONSTRAINT "FlowInstance_flowId_fkey" FOREIGN KEY ("flowId") REFERENCES "Flow"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_triggerId_fkey" FOREIGN KEY ("triggerId") REFERENCES "Trigger"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_flowInstanceId_fkey" FOREIGN KEY ("flowInstanceId") REFERENCES "FlowInstance"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "Template"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConfigAudit" ADD CONSTRAINT "ConfigAudit_configId_fkey" FOREIGN KEY ("configId") REFERENCES "SystemConfig"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
