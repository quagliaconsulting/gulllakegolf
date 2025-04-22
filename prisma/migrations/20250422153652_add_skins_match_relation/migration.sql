-- AddForeignKey
ALTER TABLE "SkinsResult" ADD CONSTRAINT "SkinsResult_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE SET NULL ON UPDATE CASCADE;
