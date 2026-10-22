-- CreateTable
CREATE TABLE "PageView" (
    "id" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "referrerHost" TEXT,
    "country" TEXT,
    "device" TEXT,
    "browser" TEXT,
    "visitorHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PageView_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalyticsSalt" (
    "day" TEXT NOT NULL,
    "salt" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnalyticsSalt_pkey" PRIMARY KEY ("day")
);

-- CreateTable
CREATE TABLE "MonthlyTraffic" (
    "month" TEXT NOT NULL,
    "visitors" INTEGER NOT NULL,
    "pageViews" INTEGER NOT NULL,

    CONSTRAINT "MonthlyTraffic_pkey" PRIMARY KEY ("month")
);

-- CreateIndex
CREATE INDEX "PageView_createdAt_idx" ON "PageView"("createdAt");

-- CreateIndex
CREATE INDEX "PageView_visitorHash_createdAt_idx" ON "PageView"("visitorHash", "createdAt");

