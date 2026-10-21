-- Add the workspace relation as nullable while existing events are backfilled.
ALTER TABLE "CalendarEvent" ADD COLUMN "workspaceId" TEXT;

-- Safety net: every event owner needs a personal workspace before the backfill.
INSERT INTO "Workspace" ("id", "name", "type", "ownerId", "createdAt", "updatedAt")
SELECT 'personal-' || "User"."id", "User"."name" || '''s workspace', 'PERSONAL'::"WorkspaceType", "User"."id", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "User"
WHERE EXISTS (SELECT 1 FROM "CalendarEvent" WHERE "CalendarEvent"."ownerId" = "User"."id")
  AND NOT EXISTS (
    SELECT 1 FROM "Workspace"
    WHERE "Workspace"."ownerId" = "User"."id" AND "Workspace"."type" = 'PERSONAL'
  );

INSERT INTO "WorkspaceMember" ("workspaceId", "userId", "role", "createdAt", "updatedAt")
SELECT 'personal-' || "User"."id", "User"."id", 'OWNER'::"WorkspaceRole", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "User"
WHERE EXISTS (SELECT 1 FROM "Workspace" WHERE "Workspace"."id" = 'personal-' || "User"."id")
ON CONFLICT DO NOTHING;

-- Existing events stay private: they move into their owner's personal workspace.
UPDATE "CalendarEvent"
SET "workspaceId" = (
  SELECT "Workspace"."id" FROM "Workspace"
  WHERE "Workspace"."ownerId" = "CalendarEvent"."ownerId" AND "Workspace"."type" = 'PERSONAL'
  ORDER BY "Workspace"."createdAt" ASC
  LIMIT 1
);

ALTER TABLE "CalendarEvent" ALTER COLUMN "workspaceId" SET NOT NULL;

-- CreateIndex
CREATE INDEX "CalendarEvent_workspaceId_startsAt_idx" ON "CalendarEvent"("workspaceId", "startsAt");

-- AddForeignKey
ALTER TABLE "CalendarEvent" ADD CONSTRAINT "CalendarEvent_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
