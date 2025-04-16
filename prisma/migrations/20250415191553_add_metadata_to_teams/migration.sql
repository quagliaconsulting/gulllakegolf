-- DropForeignKey
ALTER TABLE "Accommodation" DROP CONSTRAINT "Accommodation_tournamentId_fkey";

-- DropForeignKey
ALTER TABLE "CTPResult" DROP CONSTRAINT "CTPResult_tournamentId_fkey";

-- DropForeignKey
ALTER TABLE "Course" DROP CONSTRAINT "Course_tournamentId_fkey";

-- DropForeignKey
ALTER TABLE "FormatMultiplier" DROP CONSTRAINT "FormatMultiplier_tournamentId_fkey";

-- DropForeignKey
ALTER TABLE "GalleryPhoto" DROP CONSTRAINT "GalleryPhoto_tournamentId_fkey";

-- DropForeignKey
ALTER TABLE "Match" DROP CONSTRAINT "Match_tournamentId_fkey";

-- DropForeignKey
ALTER TABLE "PlayerPayment" DROP CONSTRAINT "PlayerPayment_tournamentId_fkey";

-- DropForeignKey
ALTER TABLE "Report" DROP CONSTRAINT "Report_tournamentId_fkey";

-- DropForeignKey
ALTER TABLE "Schedule" DROP CONSTRAINT "Schedule_tournamentId_fkey";

-- DropForeignKey
ALTER TABLE "SkinsResult" DROP CONSTRAINT "SkinsResult_tournamentId_fkey";

-- DropForeignKey
ALTER TABLE "Team" DROP CONSTRAINT "Team_tournamentId_fkey";

-- AlterTable
ALTER TABLE "Team" ADD COLUMN     "metadata" JSONB;

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Course" ADD CONSTRAINT "Course_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Accommodation" ADD CONSTRAINT "Accommodation_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormatMultiplier" ADD CONSTRAINT "FormatMultiplier_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Schedule" ADD CONSTRAINT "Schedule_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GalleryPhoto" ADD CONSTRAINT "GalleryPhoto_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerPayment" ADD CONSTRAINT "PlayerPayment_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CTPResult" ADD CONSTRAINT "CTPResult_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SkinsResult" ADD CONSTRAINT "SkinsResult_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
