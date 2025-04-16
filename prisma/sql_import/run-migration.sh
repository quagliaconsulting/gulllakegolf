#!/bin/bash
set -e

# Database migration and import script

# 1. Set environment variables from .env
if [ -f ../../.env ]; then
  export $(grep -v '^#' ../../.env | xargs)
  echo "Loaded environment from ../../.env"
else
  echo "Error: ../../.env file not found"
  exit 1
fi

# Parse the connection string manually for PostgreSQL
# Format is: postgresql://username:password@hostname:port/database?schema=public
CONNECTION_STRING="${DATABASE_URL}"

# Extract username (everything between // and : before @)
DB_USER=$(echo "${CONNECTION_STRING}" | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')

# Extract password (everything between : and @ after //)
DB_PASS=$(echo "${CONNECTION_STRING}" | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')

# Extract host (everything between @ and : before /)
DB_HOST=$(echo "${CONNECTION_STRING}" | sed -n 's/.*@\([^:]*\):.*/\1/p')

# Extract port (everything between : and / after @)
DB_PORT=$(echo "${CONNECTION_STRING}" | sed -n 's/.*@[^:]*:\([^/]*\)\/.*/\1/p')

# Extract database name (everything between / and ? after port)
DB_NAME=$(echo "${CONNECTION_STRING}" | sed -n 's/.*\/\([^?]*\).*/\1/p')

echo "Database connection info:"
echo "  Host: $DB_HOST"
echo "  Port: $DB_PORT"
echo "  Database: $DB_NAME"
echo "  User: $DB_USER"

# 2. Run the Prisma database migration
echo "Running Prisma database migration..."
cd ../..
npx prisma migrate deploy
cd prisma/sql_import

# 3. Execute the SQL import script to restore data
echo "Importing data..."
export PGPASSWORD=$DB_PASS

# First run the basic import to create the main structure
psql -h $DB_HOST -p $DB_PORT -d $DB_NAME -U $DB_USER -c "
-- Create the uuid extension if not exists
CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";

-- Tournament table
TRUNCATE TABLE \"Tournament\" CASCADE;
INSERT INTO \"Tournament\" (id, name, year, location, \"startDate\", \"endDate\", \"createdAt\", \"updatedAt\", \"hasCTP\", \"hasSkins\")
VALUES
('6b5eaadf-9d01-4f1a-b3ba-da96688aafc2', 'Spring Classic', 2025, 'Gull Lake', '2025-04-25 00:00:00', '2025-04-26 00:00:00', '2025-04-15 02:25:52.536000', '2025-04-15 05:20:25.028000', true, true);

-- Update with CTP/Skins info
UPDATE \"Tournament\" 
SET 
  \"buyIn\" = 200.0,
  \"totalPrize\" = 1600.0,
  \"ctpPrizeAmount\" = 100.0,
  \"skinsPrizeAmount\" = 20.0,
  \"payoutStructure\" = '{\"first\": 0.5, \"second\": 0.3, \"third\": 0.2}'
WHERE id = '6b5eaadf-9d01-4f1a-b3ba-da96688aafc2';

-- Team table
TRUNCATE TABLE \"Team\" CASCADE;
INSERT INTO \"Team\" (id, name, \"tournamentId\", \"createdAt\", \"updatedAt\")
VALUES
  ('2d7e306a-38b5-49dd-8fbe-7beb34025bea', 'Spartan Dawgs', '6b5eaadf-9d01-4f1a-b3ba-da96688aafc2', '2025-04-15 02:25:52.536000', '2025-04-15 02:25:52.536000'),
  ('a01e400d-e720-4124-ad21-7aa1bbbb87bd', 'Invited Guests', '6b5eaadf-9d01-4f1a-b3ba-da96688aafc2', '2025-04-15 02:25:52.536000', '2025-04-15 02:25:52.536000');

-- Course table
TRUNCATE TABLE \"Course\" CASCADE;
INSERT INTO \"Course\" (id, name, \"tournamentId\", \"createdAt\", \"updatedAt\")
VALUES
  ('3cdd5122-d9a4-44e1-a67d-15aeb0da6efe', 'Stoatin Brae', '6b5eaadf-9d01-4f1a-b3ba-da96688aafc2', '2025-04-15 02:44:25.726000', '2025-04-15 02:44:25.726000'),
  ('2a1f27a5-86b1-4e81-a6e3-aa274c59fece', 'Bedford Valley', '6b5eaadf-9d01-4f1a-b3ba-da96688aafc2', '2025-04-15 02:44:44.925000', '2025-04-15 02:44:44.925000');

-- Schedule table
TRUNCATE TABLE \"Schedule\" CASCADE;
INSERT INTO \"Schedule\" (id, \"tournamentId\", day, date, \"createdAt\", \"updatedAt\")
VALUES
  ('872d8f71-8507-4b7d-a289-76469356a5cf', '6b5eaadf-9d01-4f1a-b3ba-da96688aafc2', 1, '2025-04-25 00:00:00', '2025-04-15 04:22:02.494000', '2025-04-15 04:22:02.494000');

-- FormatMultiplier table
TRUNCATE TABLE \"FormatMultiplier\" CASCADE;
INSERT INTO \"FormatMultiplier\" 
  (id, \"formatName\", multiplier, \"tournamentId\", \"createdAt\", \"updatedAt\", \"isFourManTeam\", points, \"halfPoints\")
VALUES
  ('3d04ece8-d63c-43d0-9f44-35eb40af8a99', 'Best Ball', 1.0, '6b5eaadf-9d01-4f1a-b3ba-da96688aafc2', '2025-04-15 02:25:52.536000', '2025-04-15 02:25:52.536000', false, 1.0, 0.5),
  ('df36a47b-7b3d-4748-bd8c-017271ec01c4', 'Scramble', 0.4, '6b5eaadf-9d01-4f1a-b3ba-da96688aafc2', '2025-04-15 02:25:52.536000', '2025-04-15 02:25:52.536000', false, 1.0, 0.5),
  ('dae07937-9074-419e-9939-2c90f38de8b0', 'Alternate Shot', 0.7, '6b5eaadf-9d01-4f1a-b3ba-da96688aafc2', '2025-04-15 02:25:52.536000', '2025-04-15 02:25:52.536000', false, 1.0, 0.5),
  ('8bc355e6-a594-4572-a1b4-afb5e9938b39', 'Chapman', 0.6, '6b5eaadf-9d01-4f1a-b3ba-da96688aafc2', '2025-04-15 02:25:52.536000', '2025-04-15 02:25:52.536000', false, 1.0, 0.5),
  ('a1f34fa4-1f86-40a3-bc0b-d02c515d071f', 'Singles', 1.0, '6b5eaadf-9d01-4f1a-b3ba-da96688aafc2', '2025-04-15 04:13:22.758000', '2025-04-15 04:13:22.758000', false, 1.0, 0.5');

-- Player table (first few)
TRUNCATE TABLE \"Player\" CASCADE;
INSERT INTO \"Player\" (id, name, email, phone, \"photoUrl\", \"handicapIndex\", \"teamId\", \"createdAt\", \"updatedAt\")
VALUES
  ('5c0db0f6-f077-41d3-b164-4728a4b93b07', 'James Quaglia', NULL, NULL, NULL, 10.0, '2d7e306a-38b5-49dd-8fbe-7beb34025bea', '2025-04-15 02:51:48.081000', '2025-04-15 02:51:48.081000'),
  ('8c7a0763-b952-4848-a93f-22466d71949f', 'Matt Allgeier', NULL, NULL, NULL, 10.0, '2d7e306a-38b5-49dd-8fbe-7beb34025bea', '2025-04-15 02:51:48.116000', '2025-04-15 02:51:48.116000'),
  ('c7b042f4-cfce-43d9-a2fc-2e19d30c10e0', 'Joe Pacente', NULL, NULL, NULL, 10.0, 'a01e400d-e720-4124-ad21-7aa1bbbb87bd', '2025-04-15 02:51:48.116000', '2025-04-15 02:51:48.116000'),
  ('b8c77d38-22c2-4a83-95c2-6c7b9f467d14', 'Brett Deeter', NULL, NULL, NULL, 10.0, 'a01e400d-e720-4124-ad21-7aa1bbbb87bd', '2025-04-15 02:51:48.116000', '2025-04-15 02:51:48.116000');

-- Add holes for courses
TRUNCATE TABLE \"Hole\" CASCADE;
INSERT INTO \"Hole\" (id, number, par, handicap, distance, \"isPar3\", \"courseId\", \"createdAt\", \"updatedAt\")
VALUES
  -- Stoatin Brae holes
  (uuid_generate_v4(), 1, 4, 1, 350, false, '3cdd5122-d9a4-44e1-a67d-15aeb0da6efe', NOW(), NOW()),
  (uuid_generate_v4(), 2, 5, 3, 520, false, '3cdd5122-d9a4-44e1-a67d-15aeb0da6efe', NOW(), NOW()),
  (uuid_generate_v4(), 3, 3, 2, 180, true, '3cdd5122-d9a4-44e1-a67d-15aeb0da6efe', NOW(), NOW()),
  (uuid_generate_v4(), 4, 4, 5, 420, false, '3cdd5122-d9a4-44e1-a67d-15aeb0da6efe', NOW(), NOW()),
  (uuid_generate_v4(), 5, 3, 9, 160, true, '3cdd5122-d9a4-44e1-a67d-15aeb0da6efe', NOW(), NOW()),
  (uuid_generate_v4(), 6, 4, 7, 380, false, '3cdd5122-d9a4-44e1-a67d-15aeb0da6efe', NOW(), NOW()),
  (uuid_generate_v4(), 7, 5, 11, 530, false, '3cdd5122-d9a4-44e1-a67d-15aeb0da6efe', NOW(), NOW()),
  (uuid_generate_v4(), 8, 4, 13, 400, false, '3cdd5122-d9a4-44e1-a67d-15aeb0da6efe', NOW(), NOW()),
  (uuid_generate_v4(), 9, 3, 15, 175, true, '3cdd5122-d9a4-44e1-a67d-15aeb0da6efe', NOW(), NOW()),
  -- Bedford Valley holes
  (uuid_generate_v4(), 1, 4, 2, 360, false, '2a1f27a5-86b1-4e81-a6e3-aa274c59fece', NOW(), NOW()),
  (uuid_generate_v4(), 2, 4, 4, 410, false, '2a1f27a5-86b1-4e81-a6e3-aa274c59fece', NOW(), NOW()),
  (uuid_generate_v4(), 3, 3, 6, 170, true, '2a1f27a5-86b1-4e81-a6e3-aa274c59fece', NOW(), NOW()),
  (uuid_generate_v4(), 4, 5, 8, 540, false, '2a1f27a5-86b1-4e81-a6e3-aa274c59fece', NOW(), NOW()),
  (uuid_generate_v4(), 5, 4, 10, 390, false, '2a1f27a5-86b1-4e81-a6e3-aa274c59fece', NOW(), NOW()),
  (uuid_generate_v4(), 6, 3, 12, 150, true, '2a1f27a5-86b1-4e81-a6e3-aa274c59fece', NOW(), NOW()),
  (uuid_generate_v4(), 7, 4, 14, 420, false, '2a1f27a5-86b1-4e81-a6e3-aa274c59fece', NOW(), NOW()),
  (uuid_generate_v4(), 8, 5, 16, 510, false, '2a1f27a5-86b1-4e81-a6e3-aa274c59fece', NOW(), NOW()),
  (uuid_generate_v4(), 9, 4, 18, 440, false, '2a1f27a5-86b1-4e81-a6e3-aa274c59fece', NOW(), NOW());
"

# Create empty SkinsResult and CTPResult tables
psql -h $DB_HOST -p $DB_PORT -d $DB_NAME -U $DB_USER -c "
-- SkinsResult and CTPResult are new tables - no data to import
TRUNCATE TABLE \"SkinsResult\" CASCADE;
TRUNCATE TABLE \"CTPResult\" CASCADE;
TRUNCATE TABLE \"PlayerPayment\" CASCADE;
"

# 4. Generate Prisma client
echo "Generating Prisma client..."
cd ../..
npx prisma generate

echo "Migration and data import completed successfully!"