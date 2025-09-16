// services/couponService.js
const { v4: uuidv4 } = require("uuid");
const prisma = require("../utils/prisma");
const { genCodeCoupon } = require("../utils/gencodecoupon");

async function redeemCoupon({ menu_id, menu_name, points_used, user_id, user_uid, menu_image }) {
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({ where: { userid: user_id } });
    if (!user) throw new Error("ไม่พบผู้ใช้ในระบบ");
    if (user.userpoint < points_used) throw new Error("แต้มไม่เพียงพอในการแลกคูปอง");

    await tx.user.update({
      where: { userid: user_id },
      data: { userpoint: user.userpoint - points_used },
    });

    const couponCode = await genCodeCoupon(tx, user_id, 6);

    // วิธีที่ 1: เพิ่ม 7 ชั่วโมงแบบง่าย
    const thailandTime = new Date(new Date().getTime() + (7 * 60 * 60 * 1000));

    // วิธีที่ 2: ใช้ moment-timezone (ต้อง npm install moment-timezone)
    // const moment = require('moment-timezone');
    // const thailandTime = moment().tz('Asia/Bangkok').toDate();

    // วิธีที่ 3: ใช้ date-fns-tz (ต้อง npm install date-fns date-fns-tz)
    // const { zonedTimeToUtc } = require('date-fns-tz');
    // const thailandTime = zonedTimeToUtc(new Date(), 'Asia/Bangkok');

    const newCoupon = await tx.userCoupon.create({
      data: {
        uid: user.uid,
        idcoupon: uuidv4(),
        idmenu: menu_id,
        menuname: menu_name,
        image_menu: menu_image,
        name_cop: `คูปองสำหรับ ${menu_name}`,
        point_cop: points_used,
        unit: 1,
        code_cop: couponCode,
        date: new Date(),
        exp: new Date(new Date().setDate(new Date().getDate() + 7)),
      },
    });

    await tx.pointLog.create({
      data: {
        empid: "SYSTEM",
        name_emp: "ระบบแลกคูปอง",
        uid: user_uid,
        data_input: user_uid,
        addby: "รหัสผู้ใช้งาน",
        point: points_used,
        point_status: false,
        description: `แลกคูปองเมนู ${menu_name}`,
        createdat: thailandTime, // เพิ่ม createdat ด้วย Thai timezone
      },
    });

    return newCoupon;
  });
}

async function getUserCoupons(user_uid) {
  const coupons = await prisma.userCoupon.findMany({
    where: { uid: user_uid, status: true },
  });

  const validCouponsArray = [];
  const expiredCouponsArray = [];

  coupons.forEach((coupon) => {
    const expDate = new Date(coupon.exp);
    if (expDate < new Date()) expiredCouponsArray.push(coupon);
    else validCouponsArray.push(coupon);
  });

  return { validCouponsArray, expiredCouponsArray };
}

async function deleteUserCoupon(coupon_id) {
  const coupon = await prisma.userCoupon.findUnique({ where: { idcoupon: coupon_id } });
  if (!coupon) throw new Error("ไม่พบคูปอง");

  const currentDate = new Date();
  const expDate = new Date(coupon.exp);

  if (expDate <= currentDate) {
    await prisma.userCoupon.delete({ where: { idcoupon: coupon_id } });
    return { deleted: true };
  }

  return { deleted: false };
}

async function redeemCouponByCode(coupon_code, empid) {
  const coupon = await prisma.userCoupon.findFirst({ where: { code_cop: coupon_code } });
  if (!coupon) throw new Error("คูปองไม่ถูกต้อง");
  if (!coupon.status) throw new Error("คูปองถูกใช้งานไปแล้ว");
  if (coupon.exp && new Date(coupon.exp) < new Date()) throw new Error("คูปองหมดอายุแล้ว");

  // ดึงข้อมูลพนักงานเพื่อเอา name_emp
  const employee = await prisma.empuser.findUnique({ where: { empid } });
  if (!employee) throw new Error("ไม่พบข้อมูลพนักงาน");

  try {
    await prisma.$transaction(async (tx) => {
      // อัพเดทสถานะคูปอง
      await tx.userCoupon.update({
        where: { idcoupon: coupon.idcoupon },
        data: { status: false },
      });

      // สร้าง history การใช้งาน
      const couponHistory = await tx.couponHistory.create({
        data: {
          empid,
          uid: coupon.uid,
          idcoupon: coupon.idcoupon,
          menuname: coupon.menuname,
          unit: coupon.unit,
          description: `คูปองถูกใช้โดยพนักงาน ID: ${empid}`,
          status_Cop: false,
        },
      });

      // --- ส่วนที่ปรับปรุง ---
      // สร้าง Date object ใหม่จากเวลาที่บันทึกใน couponHistory (ซึ่งเป็น UTC)
      // จากนั้นเพิ่มเวลาเข้าไป 7 ชั่วโมงเพื่อแปลงเป็นเวลาประเทศไทย
      const thaiCreateDate = new Date(couponHistory.createdat);
      thaiCreateDate.setHours(thaiCreateDate.getHours() + 7);

      // บันทึกข้อมูลเข้า receipt_coupon ตาม schema ที่กำหนด
      await tx.receipt_coupon.create({
        data: {
          menu_name: coupon.menuname,
          point_coupon: coupon.point_cop,
          uid: coupon.uid,
          code_coupon: coupon.code_cop,
          create_date: thaiCreateDate, // ใช้เวลาประเทศไทยที่ปรับแล้ว
          employee_id: empid,
          name_emp: employee.name_emp,
          unit: coupon.unit,
          coupon_status: 'ใช้งานแล้ว'
        },
      });
    });
  } catch (error) {
    console.error('Transaction failed:', error);
    throw new Error(`ไม่สามารถใช้งานคูปองได้: ${error.message}`);
  }

  return coupon;
}

async function getCouponLogs() {
  return prisma.couponHistory.findMany({
    orderBy: { createdat: "desc" },
  });
}

async function getReceiptCouponsByUid(uid) {
  try {
    const receiptCoupons = await prisma.receipt_coupon.findMany({
      where: {
        uid: uid
      },
      orderBy: {
        create_date: 'desc'
      }
    });
    
    return receiptCoupons;
  } catch (error) {
    console.error('Error fetching receipt coupons:', error);
    throw new Error(`ไม่สามารถดึงข้อมูลคูปองได้: ${error.message}`);
  }
}

module.exports = {
  redeemCoupon,
  getUserCoupons,
  deleteUserCoupon,
  redeemCouponByCode,
  getCouponLogs,
  getReceiptCouponsByUid,
};
