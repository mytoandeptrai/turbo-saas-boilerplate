-- CreateEnum
CREATE TYPE "AtsProvider" AS ENUM ('ASHBY', 'GREENHOUSE', 'LEVER', 'WORKABLE', 'CUSTOM');

-- CreateEnum
CREATE TYPE "RemoteScope" AS ENUM ('WORLDWIDE', 'APAC_FRIENDLY', 'RESTRICTED_US_EU', 'UNKNOWN');

-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logoUrl" TEXT,
    "careerUrl" TEXT NOT NULL,
    "linkedInUrl" TEXT,
    "country" TEXT,
    "atsProvider" "AtsProvider" NOT NULL DEFAULT 'CUSTOM',
    "atsSlug" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Job" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "department" TEXT,
    "locationRaw" TEXT,
    "remoteScope" "RemoteScope" NOT NULL DEFAULT 'UNKNOWN',
    "minSalary" INTEGER,
    "maxSalary" INTEGER,
    "currency" TEXT DEFAULT 'USD',
    "techTags" TEXT[],
    "applyUrl" TEXT NOT NULL,
    "jobUrl" TEXT,
    "description" TEXT,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "publishedAt" TIMESTAMP(3),
    "lastVerifiedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobAlertSubscriber" (
    "id" TEXT NOT NULL,
    "email" TEXT,
    "telegram" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JobAlertSubscriber_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Company_slug_key" ON "Company"("slug");

-- CreateIndex
CREATE INDEX "Company_atsProvider_isActive_idx" ON "Company"("atsProvider", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Job_slug_key" ON "Job"("slug");

-- CreateIndex
CREATE INDEX "Job_remoteScope_isActive_idx" ON "Job"("remoteScope", "isActive");

-- CreateIndex
CREATE INDEX "Job_techTags_idx" ON "Job"("techTags");

-- CreateIndex
CREATE UNIQUE INDEX "Job_companyId_externalId_key" ON "Job"("companyId", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "JobAlertSubscriber_email_key" ON "JobAlertSubscriber"("email");

-- CreateIndex
CREATE UNIQUE INDEX "JobAlertSubscriber_telegram_key" ON "JobAlertSubscriber"("telegram");

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
