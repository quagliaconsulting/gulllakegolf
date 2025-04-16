-- Course table
TRUNCATE TABLE "Course" CASCADE;
INSERT INTO "Course" (id, name, "tournamentId", "createdAt", "updatedAt")
VALUES
  ('3cdd5122-d9a4-44e1-a67d-15aeb0da6efe', 'Stoatin Brae', '6b5eaadf-9d01-4f1a-b3ba-da96688aafc2', '2025-04-15 02:44:25.726000', '2025-04-15 02:44:25.726000'),
  ('2a1f27a5-86b1-4e81-a6e3-aa274c59fece', 'Bedford Valley', '6b5eaadf-9d01-4f1a-b3ba-da96688aafc2', '2025-04-15 02:44:44.925000', '2025-04-15 02:44:44.925000');