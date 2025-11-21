-- CreateIndex
CREATE INDEX "Contact_phone_idx" ON "Contact"("phone");

-- CreateIndex
CREATE INDEX "Contact_optedOut_optIn_idx" ON "Contact"("optedOut", "optIn");

-- CreateIndex
CREATE INDEX "Message_contactId_createdAt_idx" ON "Message"("contactId", "createdAt");

-- CreateIndex
CREATE INDEX "Message_flowInstanceId_idx" ON "Message"("flowInstanceId");

-- CreateIndex
CREATE INDEX "Trigger_type_active_idx" ON "Trigger"("type", "active");

-- CreateIndex
CREATE INDEX "Trigger_priority_idx" ON "Trigger"("priority");
