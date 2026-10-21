-- CreateTable
CREATE TABLE "Whiteboard" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "elements" JSONB NOT NULL DEFAULT '[]',
    "version" INTEGER NOT NULL DEFAULT 0,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Whiteboard_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Whiteboard_projectId_key" ON "Whiteboard"("projectId");

-- AddForeignKey
ALTER TABLE "Whiteboard" ADD CONSTRAINT "Whiteboard_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Whiteboard" ADD CONSTRAINT "Whiteboard_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
