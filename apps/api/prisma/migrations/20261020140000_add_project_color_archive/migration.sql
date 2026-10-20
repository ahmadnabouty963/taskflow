ALTER TABLE "Project"
ADD COLUMN "color" TEXT NOT NULL DEFAULT '#6D5EF5',
ADD COLUMN "archivedAt" TIMESTAMP(3);

DROP INDEX "Project_ownerId_idx";

CREATE INDEX "Project_ownerId_archivedAt_idx"
ON "Project"("ownerId", "archivedAt");
