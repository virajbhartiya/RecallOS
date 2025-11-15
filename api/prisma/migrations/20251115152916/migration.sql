-- CreateTable
CREATE TABLE "privacy_settings" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "domain" TEXT NOT NULL,
    "block_capture" BOOLEAN NOT NULL DEFAULT false,
    "block_search" BOOLEAN NOT NULL DEFAULT false,
    "redact_content" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "privacy_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "event_type" TEXT NOT NULL,
    "event_category" TEXT NOT NULL,
    "resource_type" TEXT,
    "resource_id" TEXT,
    "domain" TEXT,
    "action" TEXT NOT NULL,
    "metadata" JSONB,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "privacy_settings_user_id_idx" ON "privacy_settings"("user_id");

-- CreateIndex
CREATE INDEX "privacy_settings_domain_idx" ON "privacy_settings"("domain");

-- CreateIndex
CREATE UNIQUE INDEX "privacy_settings_user_id_domain_key" ON "privacy_settings"("user_id", "domain");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs"("user_id");

-- CreateIndex
CREATE INDEX "audit_logs_event_type_idx" ON "audit_logs"("event_type");

-- CreateIndex
CREATE INDEX "audit_logs_event_category_idx" ON "audit_logs"("event_category");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- CreateIndex
CREATE INDEX "audit_logs_domain_idx" ON "audit_logs"("domain");

-- AddForeignKey
ALTER TABLE "privacy_settings" ADD CONSTRAINT "privacy_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
