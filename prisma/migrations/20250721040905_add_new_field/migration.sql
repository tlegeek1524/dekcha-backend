/*
  Warnings:

  - Added the required column `name_cop` to the `Coupon` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Coupon" ADD COLUMN     "name_cop" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "CouponHistory" ADD COLUMN     "status_Cop" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "user" ADD COLUMN     "phonenumber" TEXT;

-- CreateTable
CREATE TABLE "Poll_Point" (
    "id" SERIAL NOT NULL,
    "empid" TEXT NOT NULL,
    "uid" TEXT NOT NULL,
    "point" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "createdat" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Poll_Point_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Mailbox" (
    "id" SERIAL NOT NULL,
    "uid" TEXT NOT NULL,
    "idcoupon" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "isread" BOOLEAN NOT NULL DEFAULT false,
    "createdat" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "exp" TIMESTAMP(3) NOT NULL,
    "status" BOOLEAN NOT NULL DEFAULT true,
    "updatedat" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Mailbox_pkey" PRIMARY KEY ("id")
);
