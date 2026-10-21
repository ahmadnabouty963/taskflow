-- CreateEnum
CREATE TYPE "TaskRecurrence" AS ENUM ('NONE', 'DAILY', 'WEEKLY', 'MONTHLY');

-- AlterTable
ALTER TABLE "Task"
ADD COLUMN "recurrence" "TaskRecurrence" NOT NULL DEFAULT 'NONE',
ADD COLUMN "estimatedMinutes" INTEGER,
ADD COLUMN "actualMinutes" INTEGER,
ADD COLUMN "recurringFromId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Task_recurringFromId_key" ON "Task"("recurringFromId");
CREATE INDEX "Task_recurrence_dueDate_idx" ON "Task"("recurrence", "dueDate");

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_recurringFromId_fkey"
FOREIGN KEY ("recurringFromId") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE;
