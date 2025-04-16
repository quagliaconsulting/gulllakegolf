            /* Warnings... */
            -- AlterTable
            ALTER TABLE "PlayerPairing" ADD COLUMN     "pairingGroup" INTEGER NOT NULL DEFAULT 1;

            -- CreateIndex
            CREATE UNIQUE INDEX "PlayerPairing_matchId_playerId_pairingGroup_key" ON "PlayerPairing"("matchId", "playerId", "pairingGroup");