-- SQL script to import data directly into tables
-- Created to handle the migration to the new schema

-- First ensure we're in a transaction
BEGIN;

-- Create the uuid extension if not exists (needed for uuid_generate_v4())
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. User table - most basic one with no dependencies
TRUNCATE TABLE "User" CASCADE;
INSERT INTO "User" (id, email, password, name, role, "createdAt", "updatedAt")
VALUES
('1a108a06-8bee-4b0e-95ce-68ec8c6aadfc', 'jquaglia@ussvision.com', '$2b$10$qO5//0Blm9mvyeeDm9exvuBy4VH9LyUKcX6BKR0TgWYSaFrP3KHbO', 'james quaglia', 'PLAYER', '2025-04-14 17:19:50.240000', '2025-04-14 17:19:50.240000'),
('ee32fcd2-de3f-41d8-8235-0afbe443864b', 'deeterbr@gmail.com', '$2b$10$dyjhzCCP1cUloZAUCX8Hi.J5keGdcU.W.pLBXo3cOD0q7tzfpHpJm', 'Brett Deeter', 'PLAYER', '2025-04-14 18:38:01.150000', '2025-04-14 18:38:01.150000'),
('9ab33103-1fe7-43cc-9e19-b8c0675ccd0a', 'Suck@poop.com', '$2b$10$oppPWZ77RtP/QBFTpvDgVuGpwuvXXrtw8CkCOChjYGhz2t05eqk9S', 'You', 'PLAYER', '2025-04-15 12:58:03.706000', '2025-04-15 12:58:03.706000'),
('1d3c02f7-9159-4067-a828-be89cf55b6b7', 'poop@poop.com', '$2b$10$c4WNKUhYZXu9k07NNDRvvOkeBLvQivIXo0H7KNh.vfc5.iQcogsgu', 'this', 'PLAYER', '2025-04-15 12:58:39.809000', '2025-04-15 12:58:39.809000'),
('4aec72b2-7c51-461b-a9c0-bdb505f20cfd', 'kyle.tarter53@gmail.com', '$2b$10$jWpz1/QSfxUlmHNdRgLrAOq5IJRlOsxYyKLuLrTqQDqDjs2beJFPK', 'Walt', 'PLAYER', '2025-04-15 13:43:02.331000', '2025-04-15 13:43:02.331000'),
('9ee50f03-679e-40d3-a48e-19c2ae2cfebf', 'csmitty8@gmail.com', '$2b$10$kmdDk6X4lDIKP6J1joNDLexcnP3GzTc3WZ0Y45AI50WNsQ9CDTCV2', 'Corey Smith', 'PLAYER', '2025-04-15 13:43:39.712000', '2025-04-15 13:43:39.712000'),
('0410a503-96e0-4781-9484-3232d4d626af', 'jrpacente@gmail.com', '$2b$10$KBDMmI7T/mjB.hEH3deQCu3hXAY4c3vGFgYABlAyjtQGcuFqBxX/K', 'Joe Pacente', 'PLAYER', '2025-04-15 14:10:56.364000', '2025-04-15 14:10:56.364000'),
('6b989090-7405-4289-bbff-f27f125fccdd', 'juancamara25@hotmail.com', '$2b$10$x8isZqZ3wLdaxvkRg0F7Pu10NH/dRtOWBsRDYTwb6Hb6o1w9RDsne', 'Juan Camara', 'PLAYER', '2025-04-15 14:20:52.413000', '2025-04-15 14:20:52.413000');

-- 2. Tournament table
TRUNCATE TABLE "Tournament" CASCADE;
INSERT INTO "Tournament" (id, name, year, location, "startDate", "endDate", "createdAt", "updatedAt", "hasCTP", "hasSkins")
VALUES
('6b5eaadf-9d01-4f1a-b3ba-da96688aafc2', 'Spring Classic', 2025, 'Gull Lake', '2025-04-25 00:00:00', '2025-04-26 00:00:00', '2025-04-15 02:25:52.536000', '2025-04-15 05:20:25.028000', true, true);

-- Now update the tournament to include CTP and Skins information
UPDATE "Tournament" 
SET 
  "buyIn" = 200.0,
  "totalPrize" = 1600.0,
  "ctpPrizeAmount" = 100.0,
  "skinsPrizeAmount" = 20.0,
  "payoutStructure" = '{"first": 0.5, "second": 0.3, "third": 0.2}'
WHERE id = '6b5eaadf-9d01-4f1a-b3ba-da96688aafc2';

-- Now we'll import the remaining tables in dependency order

-- 3. Team table (depends on Tournament)
-- Create from db_backup/Team.csv
TRUNCATE TABLE "Team" CASCADE;
COPY "Team" FROM '/home/james/Documents/jq_dev/gull_lake/db_backup/Team.csv' WITH (FORMAT csv, HEADER);

-- 4. Accommodation table (depends on Tournament)
-- Create from db_backup/Accommodation.csv
TRUNCATE TABLE "Accommodation" CASCADE;
COPY "Accommodation" FROM '/home/james/Documents/jq_dev/gull_lake/db_backup/Accommodation.csv' WITH (FORMAT csv, HEADER);

-- 5. Player table (depends on Team and Accommodation)
-- Create from db_backup/Player.csv
TRUNCATE TABLE "Player" CASCADE;
COPY "Player" FROM '/home/james/Documents/jq_dev/gull_lake/db_backup/Player.csv' WITH (FORMAT csv, HEADER);

-- 6. Course table (depends on Tournament)
-- Create from db_backup/Course.csv
TRUNCATE TABLE "Course" CASCADE;
COPY "Course" FROM '/home/james/Documents/jq_dev/gull_lake/db_backup/Course.csv' WITH (FORMAT csv, HEADER);

-- 7. Hole table (depends on Course)
-- Create from db_backup/Hole.csv
TRUNCATE TABLE "Hole" CASCADE;
COPY "Hole" FROM '/home/james/Documents/jq_dev/gull_lake/db_backup/Hole.csv' WITH (FORMAT csv, HEADER);

-- Update hole info to set isPar3 field
UPDATE "Hole" SET "isPar3" = true WHERE par = 3;

-- 8. FormatMultiplier table (depends on Tournament)
-- Create by direct INSERT statements to handle missing columns properly
TRUNCATE TABLE "FormatMultiplier" CASCADE;

-- Check the CSV file and directly insert records with all required fields
INSERT INTO "FormatMultiplier" 
  (id, "formatName", multiplier, "tournamentId", "createdAt", "updatedAt", "isFourManTeam", points, "halfPoints")
VALUES
  ('3d04ece8-d63c-43d0-9f44-35eb40af8a99', 'Best Ball', 1.0, '6b5eaadf-9d01-4f1a-b3ba-da96688aafc2', '2025-04-15 02:25:52.536000', '2025-04-15 02:25:52.536000', false, 1.0, 0.5),
  ('df36a47b-7b3d-4748-bd8c-017271ec01c4', 'Scramble', 0.4, '6b5eaadf-9d01-4f1a-b3ba-da96688aafc2', '2025-04-15 02:25:52.536000', '2025-04-15 02:25:52.536000', false, 1.0, 0.5),
  ('dae07937-9074-419e-9939-2c90f38de8b0', 'Alternate Shot', 0.7, '6b5eaadf-9d01-4f1a-b3ba-da96688aafc2', '2025-04-15 02:25:52.536000', '2025-04-15 02:25:52.536000', false, 1.0, 0.5),
  ('8bc355e6-a594-4572-a1b4-afb5e9938b39', 'Chapman', 0.6, '6b5eaadf-9d01-4f1a-b3ba-da96688aafc2', '2025-04-15 02:25:52.536000', '2025-04-15 02:25:52.536000', false, 1.0, 0.5),
  ('a1f34fa4-1f86-40a3-bc0b-d02c515d071f', 'Singles', 1.0, '6b5eaadf-9d01-4f1a-b3ba-da96688aafc2', '2025-04-15 04:13:22.758000', '2025-04-15 04:13:22.758000', false, 1.0, 0.5);

-- 9. Schedule table (depends on Tournament)
-- Create from db_backup/Schedule.csv
TRUNCATE TABLE "Schedule" CASCADE;
COPY "Schedule" FROM '/home/james/Documents/jq_dev/gull_lake/db_backup/Schedule.csv' WITH (FORMAT csv, HEADER);

-- 10. Match table (depends on Tournament, FormatMultiplier, Team, Course, Schedule)
-- Create from db_backup/Match.csv
TRUNCATE TABLE "Match" CASCADE;
COPY "Match" FROM '/home/james/Documents/jq_dev/gull_lake/db_backup/Match.csv' WITH (FORMAT csv, HEADER);

-- 11. HoleResult table (depends on Match, Hole)
-- Create from db_backup/HoleResult.csv
TRUNCATE TABLE "HoleResult" CASCADE;
COPY "HoleResult" FROM '/home/james/Documents/jq_dev/gull_lake/db_backup/HoleResult.csv' WITH (FORMAT csv, HEADER);

-- 12. PlayerPairing table (depends on Match, Player)
-- Create from db_backup/PlayerPairing.csv
TRUNCATE TABLE "PlayerPairing" CASCADE;
COPY "PlayerPairing" FROM '/home/james/Documents/jq_dev/gull_lake/db_backup/PlayerPairing.csv' WITH (FORMAT csv, HEADER);

-- 13. MatchPoints table (depends on Match)
-- Create from db_backup/MatchPoints.csv
TRUNCATE TABLE "MatchPoints" CASCADE;
COPY "MatchPoints" FROM '/home/james/Documents/jq_dev/gull_lake/db_backup/MatchPoints.csv' WITH (FORMAT csv, HEADER);

-- 14. GalleryPhoto table (depends on Tournament)
-- Create from db_backup/GalleryPhoto.csv
TRUNCATE TABLE "GalleryPhoto" CASCADE;
COPY "GalleryPhoto" FROM '/home/james/Documents/jq_dev/gull_lake/db_backup/GalleryPhoto.csv' WITH (FORMAT csv, HEADER);

-- 15. Report table (depends on Tournament)
-- Create from db_backup/Report.csv
TRUNCATE TABLE "Report" CASCADE;
COPY "Report" FROM '/home/james/Documents/jq_dev/gull_lake/db_backup/Report.csv' WITH (FORMAT csv, HEADER);

-- Fix boolean values in CSV imports
-- PostgreSQL expects lowercase 't'/'f' for boolean values, but our CSVs have 'True'/'False'

UPDATE "PlayerPairing" SET "isHomeTeam" = 
  CASE 
    WHEN "isHomeTeam" = 'True' THEN true 
    WHEN "isHomeTeam" = 'False' THEN false
    ELSE "isHomeTeam"
  END;

UPDATE "HoleResult" SET "isSkin" = 
  CASE 
    WHEN "isSkin" = 'True' THEN true 
    WHEN "isSkin" = 'False' THEN false
    ELSE "isSkin"
  END;

-- Create the new tables with some default data

-- CTP Results table - start empty
TRUNCATE TABLE "CTPResult" CASCADE;
-- Add sample CTP result if needed
-- INSERT INTO "CTPResult" (id, "tournamentId", "holeId", "playerId", distance, round, prize, paid, "createdAt", "updatedAt")
-- VALUES (uuid_generate_v4(), '6b5eaadf-9d01-4f1a-b3ba-da96688aafc2', -- tournament id
--        (SELECT id FROM "Hole" WHERE "isPar3" = true LIMIT 1), -- first par 3 hole
--        (SELECT id FROM "Player" LIMIT 1), -- first player
--        12.5, 1, 100.0, false, NOW(), NOW());

-- Skins Results table - start empty
TRUNCATE TABLE "SkinsResult" CASCADE;
-- Add sample skins result if needed
-- INSERT INTO "SkinsResult" (id, "tournamentId", "playerId", "holeNumber", score, prize, paid, "createdAt", "updatedAt")
-- VALUES (uuid_generate_v4(), '6b5eaadf-9d01-4f1a-b3ba-da96688aafc2', -- tournament id
--        (SELECT id FROM "Player" LIMIT 1), -- first player
--        3, -- hole number
--        2, -- score (eagle)
--        20.0, false, NOW(), NOW());

-- Player Payments table - start empty
TRUNCATE TABLE "PlayerPayment" CASCADE;
-- Add sample payment entry if needed
-- INSERT INTO "PlayerPayment" (id, "tournamentId", "playerId", amount, type, status, "createdAt", "updatedAt")
-- VALUES (uuid_generate_v4(), '6b5eaadf-9d01-4f1a-b3ba-da96688aafc2', -- tournament id
--        (SELECT id FROM "Player" LIMIT 1), -- first player
--        200.0, 'BUY_IN', 'PAID', NOW(), NOW());

COMMIT;