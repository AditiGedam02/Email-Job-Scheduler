/*
  Warnings:

  - Added the required column `webhookUrl` to the `SlackIntegration` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "SlackIntegration" ADD COLUMN     "webhookUrl" TEXT NOT NULL,
ALTER COLUMN "connectedAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMP(3);
