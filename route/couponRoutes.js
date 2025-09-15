const express = require("express");
const router = express.Router();

// import controller functions
const { 
    redeemCoupon, 
    redeemCouponByCode, 
    getUserCoupons, 
    deleteUserCoupon,
    getLogusecoupon,
    getReceiptCouponsByUid
} = require("../controller/couponController");
const { authenticateEmployee } = require('../middleware/employeeAuth');

// ใช้ uid + code สำหรับ redeem
router.post("/redeem",redeemCoupon);

router.get("/logusedcoupon", getLogusecoupon);

// ใช้เฉพาะ coupon code สำหรับ redeem (ดึง empid จาก JWT)
router.post("/usedcoupon", authenticateEmployee, redeemCouponByCode);

// ดึงคูปองของผู้ใช้
router.get("/:user_uid", getUserCoupons);

// ลบคูปอง
router.delete("/delete/:coupon_id", deleteUserCoupon);

router.get("/receipt/:uid", getReceiptCouponsByUid);

module.exports = router;
