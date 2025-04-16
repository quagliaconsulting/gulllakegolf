-- AlterTable
ALTER TABLE "Match" ADD COLUMN     "foursomeGroupId" TEXT,
ADD COLUMN     "playerToPlayerMatch" BOOLEAN NOT NULL DEFAULT false;
