CREATE TABLE IF NOT EXISTS "HelpdeskNode" (
  "id" TEXT NOT NULL, "label" TEXT NOT NULL, "question" TEXT, "order" INTEGER NOT NULL DEFAULT 0,
  "depth" INTEGER NOT NULL DEFAULT 0, "parentId" TEXT, "answerText" TEXT,
  "manualPageId" TEXT, "regulationId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "HelpdeskNode_pkey" PRIMARY KEY ("id")
);
