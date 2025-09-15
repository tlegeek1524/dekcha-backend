-- CreateTable
CREATE TABLE "public"."receipt_coupon" (
    "id" SERIAL NOT NULL,
    "menu_name" TEXT NOT NULL,
    "point_coupon" INTEGER NOT NULL,
    "uid" TEXT NOT NULL,
    "code_coupon" TEXT,
    "create_date" TIMESTAMP(3) NOT NULL,
    "employee_id" TEXT NOT NULL,
    "name_emp" TEXT NOT NULL,
    "unit" INTEGER NOT NULL,
    "coupon_status" TEXT NOT NULL,

    CONSTRAINT "receipt_coupon_pkey" PRIMARY KEY ("id")
);
