-- Create the uuid extension if not exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Hole table
TRUNCATE TABLE "Hole" CASCADE;
INSERT INTO "Hole" (id, number, par, handicap, distance, "isPar3", "courseId", "createdAt", "updatedAt")
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