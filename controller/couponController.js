// controllers/couponController.js
const couponService = require("../services/couponService");

// ✅ Redeem Coupon
exports.redeemCoupon = async (req, res) => {
  try {
    const result = await couponService.redeemCoupon(req.body);
    res.status(201).json({ message: "แลกคูปองสำเร็จ", coupon: result });
  } catch (error) {
    res.status(400).json({ message: error.message || "เกิดข้อผิดพลาด" });
  }
};

// ✅ Get User Coupons
exports.getUserCoupons = async (req, res) => {
  try {
    const { user_uid } = req.params;
    const { validCouponsArray, expiredCouponsArray } = await couponService.getUserCoupons(user_uid);

    res.status(200).json({
      status: "Success",
      validCoupons: validCouponsArray,
      expiredCoupons: expiredCouponsArray,
      totalValidCoupons: validCouponsArray.length,
      totalExpiredCoupons: expiredCouponsArray.length,
    });
  } catch (error) {
    res.status(500).json({ message: error.message || "เกิดข้อผิดพลาด" });
  }
};

// ✅ Delete User Coupon
exports.deleteUserCoupon = async (req, res) => {
  try {
    const { coupon_id } = req.params;
    const result = await couponService.deleteUserCoupon(coupon_id);

    if (result.deleted) return res.status(200).json({ message: "ลบคูปองสำเร็จ" });
    return res.status(400).json({ message: "คูปองยังไม่หมดอายุ ไม่สามารถลบได้" });
  } catch (error) {
    res.status(500).json({ message: error.message || "เกิดข้อผิดพลาด" });
  }
};

// ✅ Redeem Coupon by Code
exports.redeemCouponByCode = async (req, res) => {
  try {
    const { coupon_code } = req.body;
    const empid = req.employee?.empid; // กันกรณี req.employee ไม่มี

    if (!coupon_code || !empid) {
      return res.status(400).json({
        success: false,
        message: "ข้อมูลไม่ครบถ้วน (ต้องมี coupon_code และ empid)",
      });
    }

    const coupon = await couponService.redeemCouponByCode(coupon_code, empid);

    res.status(200).json({
      success: true,
      message: "ใช้คูปองสำเร็จ",
      data: {
        couponCode: coupon.code_cop,
        empid,
        menuname: coupon.menuname,
        unit: coupon.unit,
      },
    });
  } catch (error) {
    console.error("redeemCouponByCode error:", error);
    res.status(400).json({
      success: false,
      message: error.message || "เกิดข้อผิดพลาด",
    });
  }
};


// ✅ Get Logs
exports.getLogusecoupon = async (req, res) => {
  try {
    const logs = await couponService.getCouponLogs();
    res.status(200).json({
      status: "Success",
      message: logs.length ? "ดึงข้อมูลสำเร็จ" : "ยังไม่มีประวัติ",
      totalLogs: logs.length,
      logs,
    });
  } catch (error) {
    res.status(500).json({ message: error.message || "เกิดข้อผิดพลาด" });
  }
};
