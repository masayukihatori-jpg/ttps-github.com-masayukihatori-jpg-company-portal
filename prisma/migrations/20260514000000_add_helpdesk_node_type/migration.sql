-- Add nodeType to HelpdeskNode
ALTER TABLE "HelpdeskNode" ADD COLUMN IF NOT EXISTS "nodeType" TEXT NOT NULL DEFAULT 'choice';
