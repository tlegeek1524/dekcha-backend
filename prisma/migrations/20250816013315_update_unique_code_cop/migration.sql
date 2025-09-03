/*
  Warnings:

  - A unique constraint covering the columns `[code_cop]` on the table `userCoupon` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "userCoupon_code_cop_key" ON "userCoupon"("code_cop");
