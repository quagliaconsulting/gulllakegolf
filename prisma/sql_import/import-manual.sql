-- Manual import script to add Team data
INSERT INTO "Team" (id, name, "tournamentId", "createdAt", "updatedAt")
VALUES
  ('2d7e306a-38b5-49dd-8fbe-7beb34025bea', 'Spartan Dawgs', '6b5eaadf-9d01-4f1a-b3ba-da96688aafc2', '2025-04-15 02:25:52.536000', '2025-04-15 02:25:52.536000'),
  ('a01e400d-e720-4124-ad21-7aa1bbbb87bd', 'Invited Guests', '6b5eaadf-9d01-4f1a-b3ba-da96688aafc2', '2025-04-15 02:25:52.536000', '2025-04-15 02:25:52.536000');

-- Manual import for Course data
INSERT INTO "Course" (id, name, "tournamentId", "createdAt", "updatedAt")
VALUES
  ('3cdd5122-d9a4-44e1-a67d-15aeb0da6efe', 'Stoatin Brae', '6b5eaadf-9d01-4f1a-b3ba-da96688aafc2', '2025-04-15 02:44:25.726000', '2025-04-15 02:44:25.726000'),
  ('2a1f27a5-86b1-4e81-a6e3-aa274c59fece', 'Bedford Valley', '6b5eaadf-9d01-4f1a-b3ba-da96688aafc2', '2025-04-15 02:44:44.925000', '2025-04-15 02:44:44.925000');

-- Manual import for Schedule data
INSERT INTO "Schedule" (id, "tournamentId", day, date, "createdAt", "updatedAt")
VALUES
  ('872d8f71-8507-4b7d-a289-76469356a5cf', '6b5eaadf-9d01-4f1a-b3ba-da96688aafc2', 1, '2025-04-25 00:00:00', '2025-04-15 04:22:02.494000', '2025-04-15 04:22:02.494000');

-- Manual import for Player data (first few players as examples)
INSERT INTO "Player" (id, name, email, phone, "photoUrl", "handicapIndex", "teamId", "accommodationId", "createdAt", "updatedAt")
VALUES
  ('5c0db0f6-f077-41d3-b164-4728a4b93b07', 'James Quaglia', NULL, NULL, NULL, 10.0, '2d7e306a-38b5-49dd-8fbe-7beb34025bea', NULL, '2025-04-15 02:51:48.081000', '2025-04-15 02:51:48.081000'),
  ('8c7a0763-b952-4848-a93f-22466d71949f', 'Matt Allgeier', NULL, NULL, NULL, 10.0, '2d7e306a-38b5-49dd-8fbe-7beb34025bea', NULL, '2025-04-15 02:51:48.116000', '2025-04-15 02:51:48.116000');

-- Create holes for the courses (example holes for Stoatin Brae)
INSERT INTO "Hole" (id, number, par, handicap, distance, "isPar3", "courseId", "createdAt", "updatedAt")
VALUES
  (uuid_generate_v4(), 1, 4, 1, 350, false, '3cdd5122-d9a4-44e1-a67d-15aeb0da6efe', NOW(), NOW()),
  (uuid_generate_v4(), 2, 5, 3, 520, false, '3cdd5122-d9a4-44e1-a67d-15aeb0da6efe', NOW(), NOW()),
  (uuid_generate_v4(), 3, 3, 2, 180, true, '3cdd5122-d9a4-44e1-a67d-15aeb0da6efe', NOW(), NOW());