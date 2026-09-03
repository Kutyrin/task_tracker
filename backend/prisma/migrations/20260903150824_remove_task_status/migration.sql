/*
  Warnings:

  - You are about to drop the column `status` on the `Task` table. All the data in the column will be lost.

*/

UPDATE "Task"
SET
  "projectId" = 1,
  "columnId" = 2
WHERE "projectId" IS NULL
  AND "columnId" IS NULL
  AND "status" = 'TODO';

-- DropIndex
DROP INDEX "Task_status_idx";

-- AlterTable
ALTER TABLE "Task" DROP COLUMN "status";

-- DropEnum
DROP TYPE "TaskStatus";
