/*
  Warnings:

  - Added the required column `name_cop` to the `userCoupon` table without a default value. This is not possible if the table is not empty.
  - Added the required column `point_cop` to the `userCoupon` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "userCoupon" ADD COLUMN     "image_menu" TEXT,
ADD COLUMN     "name_cop" TEXT NOT NULL,
ADD COLUMN     "point_cop" INTEGER NOT NULL;
