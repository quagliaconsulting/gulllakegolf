-- Tournament table
TRUNCATE TABLE "Tournament" CASCADE;
INSERT INTO "Tournament" (id, name, year, location, "startDate", "endDate", "createdAt", "updatedAt", "hasCTP", "hasSkins")
VALUES
('6b5eaadf-9d01-4f1a-b3ba-da96688aafc2', 'Spring Classic', 2025, 'Gull Lake', '2025-04-25 00:00:00', '2025-04-26 00:00:00', '2025-04-15 02:25:52.536000', '2025-04-15 05:20:25.028000', true, true);

-- Update with CTP/Skins info
UPDATE "Tournament" 
SET 
  "buyIn" = 200.0,
  "totalPrize" = 1600.0,
  "ctpPrizeAmount" = 100.0,
  "skinsPrizeAmount" = 20.0,
  "payoutStructure" = '{"first": 0.5, "second": 0.3, "third": 0.2}'
WHERE id = '6b5eaadf-9d01-4f1a-b3ba-da96688aafc2';