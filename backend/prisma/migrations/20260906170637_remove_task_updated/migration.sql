/*
  Warnings:

  - The values [TASK_UPDATED] on the enum `ActivityType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "ActivityType_new" AS ENUM ('TASK_CREATED', 'TASK_MOVED', 'TITLE_CHANGED', 'DESCRIPTION_CHANGED', 'DUE_DATE_CHANGED', 'ASSIGNEE_CHANGED', 'PRIORITY_CHANGED', 'ISSUE_TYPE_CHANGED', 'COMMENT_ADDED', 'COMMENT_UPDATED', 'COMMENT_DELETED', 'LABEL_ADDED', 'LABEL_REMOVED');
ALTER TABLE "Activity" ALTER COLUMN "type" TYPE "ActivityType_new" USING ("type"::text::"ActivityType_new");
ALTER TYPE "ActivityType" RENAME TO "ActivityType_old";
ALTER TYPE "ActivityType_new" RENAME TO "ActivityType";
DROP TYPE "public"."ActivityType_old";
COMMIT;
