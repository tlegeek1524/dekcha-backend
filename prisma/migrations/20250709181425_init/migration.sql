-- CreateTable
CREATE TABLE "user" (
    "id" SERIAL NOT NULL,
    "userid" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "pictureurl" TEXT,
    "uid" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'user',
    "userpoint" INTEGER NOT NULL DEFAULT 0,
    "isactive" BOOLEAN NOT NULL DEFAULT true,
    "createdat" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedat" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "menu" (
    "id" SERIAL NOT NULL,
    "idmenu" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "point" INTEGER NOT NULL,
    "category" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "exp" TIMESTAMP(3) NOT NULL,
    "status" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "menu_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Coupon" (
    "id" SERIAL NOT NULL,
    "idcoupon" TEXT NOT NULL,
    "idmenu" TEXT NOT NULL,
    "menuname" TEXT NOT NULL,
    "couponunit" INTEGER NOT NULL,
    "point" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "exp" TIMESTAMP(3) NOT NULL,
    "status" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Coupon_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "userCoupon" (
    "id" SERIAL NOT NULL,
    "uid" TEXT NOT NULL,
    "idcoupon" TEXT NOT NULL,
    "idmenu" TEXT NOT NULL,
    "menuname" TEXT NOT NULL,
    "unit" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "exp" TIMESTAMP(3) NOT NULL,
    "status" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "userCoupon_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Empuser" (
    "id" SERIAL NOT NULL,
    "empid" TEXT NOT NULL,
    "firstname_emp" TEXT NOT NULL,
    "lastname_emp" TEXT,
    "name_emp" TEXT NOT NULL,
    "pincode_emp" TEXT,
    "password_emp" TEXT,
    "role" TEXT NOT NULL DEFAULT 'employee',
    "isactive" BOOLEAN NOT NULL DEFAULT true,
    "status" BOOLEAN NOT NULL DEFAULT true,
    "createdat" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedat" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Empuser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PointLog" (
    "id" SERIAL NOT NULL,
    "empid" TEXT NOT NULL,
    "uid" TEXT NOT NULL,
    "point" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "createdat" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PointLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CouponHistory" (
    "id" SERIAL NOT NULL,
    "empid" TEXT NOT NULL,
    "uid" TEXT NOT NULL,
    "idcoupon" TEXT NOT NULL,
    "menuname" TEXT NOT NULL,
    "unit" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "createdat" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CouponHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_userid_key" ON "user"("userid");

-- CreateIndex
CREATE UNIQUE INDEX "user_uid_key" ON "user"("uid");

-- CreateIndex
CREATE UNIQUE INDEX "menu_idmenu_key" ON "menu"("idmenu");

-- CreateIndex
CREATE UNIQUE INDEX "Coupon_idcoupon_key" ON "Coupon"("idcoupon");

-- CreateIndex
CREATE UNIQUE INDEX "userCoupon_uid_key" ON "userCoupon"("uid");

-- CreateIndex
CREATE UNIQUE INDEX "userCoupon_idcoupon_key" ON "userCoupon"("idcoupon");

-- CreateIndex
CREATE UNIQUE INDEX "Empuser_empid_key" ON "Empuser"("empid");
