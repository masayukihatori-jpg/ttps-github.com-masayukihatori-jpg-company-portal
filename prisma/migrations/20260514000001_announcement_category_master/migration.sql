-- Drop default first (depends on enum type), then change column type, then drop enum
ALTER TABLE "Announcement" ALTER COLUMN "category" DROP DEFAULT;
ALTER TABLE "Announcement" ALTER COLUMN "category" TYPE TEXT USING "category"::TEXT;

-- Convert existing enum values to Japanese labels
UPDATE "Announcement" SET "category" = '一般' WHERE "category" = 'GENERAL';
UPDATE "Announcement" SET "category" = '人事・労務' WHERE "category" = 'HR';
UPDATE "Announcement" SET "category" = 'IT・システム' WHERE "category" = 'IT';
UPDATE "Announcement" SET "category" = '設備・オフィス' WHERE "category" = 'FACILITY';
UPDATE "Announcement" SET "category" = 'イベント' WHERE "category" = 'EVENT';

-- Set new text default
ALTER TABLE "Announcement" ALTER COLUMN "category" SET DEFAULT '一般';

-- Drop old enum type
DROP TYPE IF EXISTS "AnnouncementCategory";

-- Add organization column
ALTER TABLE "Announcement" ADD COLUMN IF NOT EXISTS "organization" TEXT NOT NULL DEFAULT '';

-- Create AnnouncementCategoryMaster table
CREATE TABLE IF NOT EXISTS "AnnouncementCategoryMaster" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "color" TEXT NOT NULL DEFAULT 'bg-gray-100 text-gray-700',
  "order" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AnnouncementCategoryMaster_pkey" PRIMARY KEY ("id")
);

-- Seed default categories
INSERT INTO "AnnouncementCategoryMaster" ("id", "name", "color", "order", "createdAt", "updatedAt") VALUES
  ('acm_general',  '一般',         'bg-gray-100 text-gray-700',   0, NOW(), NOW()),
  ('acm_hr',       '人事・労務',   'bg-blue-100 text-blue-700',   1, NOW(), NOW()),
  ('acm_it',       'IT・システム', 'bg-purple-100 text-purple-700', 2, NOW(), NOW()),
  ('acm_facility', '設備・オフィス', 'bg-green-100 text-green-700', 3, NOW(), NOW()),
  ('acm_event',    'イベント',     'bg-orange-100 text-orange-700', 4, NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
