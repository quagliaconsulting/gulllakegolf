-- Player table
TRUNCATE TABLE "Player" CASCADE;
INSERT INTO "Player" (id, name, email, phone, "photoUrl", "handicapIndex", "teamId", "createdAt", "updatedAt")
VALUES
  ('5c0db0f6-f077-41d3-b164-4728a4b93b07', 'James Quaglia', NULL, NULL, NULL, 10.0, '2d7e306a-38b5-49dd-8fbe-7beb34025bea', '2025-04-15 02:51:48.081000', '2025-04-15 02:51:48.081000'),
  ('8c7a0763-b952-4848-a93f-22466d71949f', 'Matt Allgeier', NULL, NULL, NULL, 10.0, '2d7e306a-38b5-49dd-8fbe-7beb34025bea', '2025-04-15 02:51:48.116000', '2025-04-15 02:51:48.116000'),
  ('c7b042f4-cfce-43d9-a2fc-2e19d30c10e0', 'Joe Pacente', NULL, NULL, NULL, 10.0, 'a01e400d-e720-4124-ad21-7aa1bbbb87bd', '2025-04-15 02:51:48.116000', '2025-04-15 02:51:48.116000'),
  ('b8c77d38-22c2-4a83-95c2-6c7b9f467d14', 'Brett Deeter', NULL, NULL, NULL, 10.0, 'a01e400d-e720-4124-ad21-7aa1bbbb87bd', '2025-04-15 02:51:48.116000', '2025-04-15 02:51:48.116000');