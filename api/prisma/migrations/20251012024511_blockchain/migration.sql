ALTER TABLE "memories" ADD COLUMN     "block_number" BIGINT,
ADD COLUMN     "blockchain_network" TEXT DEFAULT 'sepolia',
ADD COLUMN     "confirmed_at" TIMESTAMP(3),
ADD COLUMN     "gas_used" TEXT,
ADD COLUMN     "tx_hash" TEXT,
ADD COLUMN     "tx_status" TEXT DEFAULT 'pending';
CREATE UNIQUE INDEX "memories_tx_hash_key" ON "memories"("tx_hash");