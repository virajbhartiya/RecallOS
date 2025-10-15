-- CreateTable
CREATE TABLE "blockscout_transactions" (
    "id" UUID NOT NULL,
    "tx_hash" TEXT NOT NULL,
    "network" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "block_number" BIGINT,
    "gas_used" TEXT,
    "gas_price" TEXT,
    "from_address" TEXT,
    "to_address" TEXT,
    "value" TEXT,
    "timestamp" BIGINT,
    "finality_reached" BOOLEAN NOT NULL DEFAULT false,
    "finality_confirmed_at" TIMESTAMP(3),
    "raw_data" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_checked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "check_count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "blockscout_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "blockscout_transactions_tx_hash_key" ON "blockscout_transactions"("tx_hash");
