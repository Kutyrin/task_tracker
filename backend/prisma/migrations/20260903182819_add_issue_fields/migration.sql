/*
  Warnings:

  - A unique constraint covering the columns `[projectId,issueNumber]` on the table `Task` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "IssueType" AS ENUM ('TASK', 'BUG', 'STORY', 'EPIC');

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "assigneeId" INTEGER,
ADD COLUMN     "issueNumber" INTEGER,
ADD COLUMN     "issueType" "IssueType" NOT NULL DEFAULT 'TASK',
ADD COLUMN     "reporterId" INTEGER;

-- CreateIndex
CREATE INDEX "Task_reporterId_idx" ON "Task"("reporterId");

-- CreateIndex
CREATE INDEX "Task_assigneeId_idx" ON "Task"("assigneeId");

-- CreateIndex
CREATE UNIQUE INDEX "Task_projectId_issueNumber_key" ON "Task"("projectId", "issueNumber");

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
