-- CreateTable
CREATE TABLE "CompanyInfoPage" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL DEFAULT '',
    "urls" JSONB NOT NULL DEFAULT '[]',
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,

    CONSTRAINT "CompanyInfoPage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanyInfoFile" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "storedName" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "uploadedBy" TEXT,

    CONSTRAINT "CompanyInfoFile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CompanyInfoPage_slug_key" ON "CompanyInfoPage"("slug");

-- AddForeignKey
ALTER TABLE "CompanyInfoFile" ADD CONSTRAINT "CompanyInfoFile_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "CompanyInfoPage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
