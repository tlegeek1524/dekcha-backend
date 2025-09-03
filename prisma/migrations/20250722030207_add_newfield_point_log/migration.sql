/*
  Warnings:

  - Added the required column `addby` to the `PointLog` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name_emp` to the `PointLog` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "PointLog" ADD COLUMN     "addby" TEXT NOT NULL,
ADD COLUMN     "data_input" TEXT,
ADD COLUMN     "name_emp" TEXT NOT NULL;
