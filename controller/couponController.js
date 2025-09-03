const { PrismaClient } = require("@prisma/client");
const { v4: uuidv4 } = require("uuid");
const { genCodeCoupon } = require("../utils/gencodecoupon"); // นำเข้า genCodeCoupon จาก utils
const prisma = require('../utils/prisma');

exports.redeemCoupon = async (req, res) => {
    const {
        menu_id,
        menu_name,
        points_used,
        user_id,
        user_uid,
        menu_image
    } = req.body;

    if (!menu_id || !menu_name || !points_used || !user_id || !user_uid || !menu_image) {
        return res.status(400).json({ message: "ข้อมูลที่ส่งมาไม่ครบถ้วน" });
    }

    if (points_used <= 0) {
        return res.status(400).json({ message: "แต้มที่ใช้ต้องมากกว่าศูนย์" });
    }

    try {
        const result = await prisma.$transaction(async (prisma) => {
            const user = await prisma.user.findUnique({ where: { userid: user_id } });
            if (!user) {
                throw new Error("ไม่พบผู้ใช้ในระบบ");
            }

            if (user.userpoint < points_used) {
                throw new Error("แต้มไม่เพียงพอในการแลกคูปอง");
            }

            await prisma.user.update({
                where: { userid: user_id },
                data: { userpoint: user.userpoint - points_used }
            });

            // ✅ เรียกใช้ genCodeCoupon
            const couponCode = await genCodeCoupon(prisma, user_id, 6);

            const newCoupon = await prisma.userCoupon.create({
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
                    exp: new Date(new Date().setDate(new Date().getDate() + 7))
                }
            });

            await prisma.pointLog.create({
                data: {
                    empid: "SYSTEM",
                    name_emp: "ระบบแลกคูปอง",
                    uid: user_uid,
                    data_input: user_uid,
                    addby: "รหัสผู้ใช้งาน",
                    point: points_used,
                    point_status: false,
                    description: `แลกคูปองเมนู ${menu_name}`
                }
            });

            return newCoupon;
        });

        return res.status(201).json({
            message: "แลกคูปองสำเร็จ",
            coupon: result
        });

    } catch (error) {
        console.error("Redeem error:", error);
        return res.status(500).json({ message: error.message || "เกิดข้อผิดพลาดในระบบ" });
    }
};

exports.getUserCoupons = async (req, res) => {
    const { user_uid } = req.params; // รับค่า uid จาก URL หรือ params

    if (!user_uid) {
        return res.status(400).json({ message: "กรุณาระบุ UID ของผู้ใช้" });
    }

    try {
        // ค้นหาคูปองที่มีสถานะเป็น true สำหรับ user_uid นี้
        const coupons = await prisma.userCoupon.findMany({
            where: {
                uid: user_uid,
                status: true // คูปองที่สถานะเป็น true
            }
        });

        // Debug: log ดูข้อมูลคูปองที่ถูกดึงออกมา
        console.log("Coupons found:", coupons);

        if (coupons.length === 0) {
            return res.status(200).json({
                message: "ไม่มีคูปองที่ตรงเงื่อนไข"
            });
        }

        // แยกคูปองที่ยังไม่หมดอายุและคูปองที่หมดอายุ
        const validCouponsArray = [];
        const expiredCouponsArray = [];

        // ตรวจสอบวันหมดอายุของคูปอง
        coupons.forEach(coupon => {
            const expDate = new Date(coupon.exp); // แปลงวันที่หมดอายุที่เป็น string ให้เป็น Date
            if (expDate < new Date()) {
                // ถ้าหมดอายุแล้ว
                expiredCouponsArray.push(coupon);
            } else {
                // ถ้ายังไม่หมดอายุ
                validCouponsArray.push(coupon);
            }
        });

        // แปลง array เป็น object โดยใช้ coupon1, coupon2, etc. เป็น key
        const validCoupons = {};
        validCouponsArray.forEach((coupon, index) => {
            validCoupons[`coupon${index + 1}`] = coupon;
        });

        const expiredCoupons = {};
        expiredCouponsArray.forEach((coupon, index) => {
            expiredCoupons[`coupon${index + 1}`] = coupon;
        });

        // ส่งผลลัพธ์
        return res.status(200).json({
            status: "Success",
            message: "ดาวน์โหลดข้อมูลคูปองสำเร็จ",
            validCoupons: validCoupons,
            expiredCoupons: expiredCoupons,
            messageExpiredCoupons: expiredCouponsArray.length > 0 ? "มีคูปองที่หมดอายุ" : "ไม่มีคูปองที่หมดอายุ",
            totalValidCoupons: validCouponsArray.length,
            totalExpiredCoupons: expiredCouponsArray.length
        });

    } catch (error) {
        console.error("Error fetching coupons:", error);
        return res.status(500).json({ message: error.message || "เกิดข้อผิดพลาดในการดึงข้อมูลคูปอง" });
    }
};

exports.deleteUserCoupon = async (req, res) => {
    const { coupon_id } = req.params; // รับค่า ID ของคูปองจาก URL

    if (!coupon_id) {
        return res.status(400).json({ message: "กรุณาระบุ ID ของคูปองที่ต้องการลบ" });
    }

    try {
        // ค้นหาคูปองจากฐานข้อมูล
        const coupon = await prisma.userCoupon.findUnique({
            where: { idcoupon: coupon_id }
        });

        if (!coupon) {
            return res.status(404).json({ message: "ไม่พบคูปองที่ต้องการลบ" });
        }

        const currentDate = new Date();
        const expDate = new Date(coupon.exp);

        // ตรวจสอบว่า ถ้าคูปองหมดอายุแล้ว
        if (expDate <= currentDate) {
            // คูปองหมดอายุแล้วสามารถลบได้
            await prisma.userCoupon.delete({
                where: { idcoupon: coupon_id }
            });

            return res.status(200).json({
                message: "ลบคูปองสำเร็จ เนื่องจากคูปองหมดอายุ"
            });
        }

        // ถ้าคูปองยังไม่หมดอายุหรือยังสามารถใช้งานได้ (status === true) -> ไม่สามารถลบได้
        return res.status(400).json({
            message: "คูปองของคุณยังไม่หมดอายุหรือยังสามารถใช้งานได้อยู่ ไม่สามารถลบได้"
        });

    } catch (error) {
        console.error("Error deleting coupon:", error);
        return res.status(500).json({ message: error.message || "เกิดข้อผิดพลาดในการลบคูปอง" });
    }
};

exports.redeemCouponByCode = async (req, res) => {
    const { coupon_code } = req.body;
    if (!coupon_code) {
        return res.status(400).json({ success: false, message: "กรุณาระบุรหัสคูปอง" });
    }

    try {
        const empid = req.employee.empid;

        // หาคูปองจาก code
        const coupon = await prisma.userCoupon.findFirst({
            where: { code_cop: coupon_code }
        });

        if (!coupon) {
            return res.status(404).json({ success: false, message: "คูปองไม่ถูกต้อง" });
        }

        if (!coupon.status) {
            return res.status(400).json({ success: false, message: "คูปองถูกใช้งานไปแล้ว" });
        }

        if (coupon.exp && new Date(coupon.exp) < new Date()) {
            return res.status(400).json({ success: false, message: "คูปองหมดอายุแล้ว" });
        }

        // Transaction อัปเดตสถานะและบันทึกประวัติ
        await prisma.$transaction(async (tx) => {
            // อัปเดต status เป็นใช้แล้ว
            await tx.userCoupon.update({
                where: { idcoupon: coupon.idcoupon },
                data: { status: false }
            });

            // บันทึกประวัติการใช้คูปอง
            await tx.couponHistory.create({
                data: {
                    empid,
                    uid: coupon.uid,
                    idcoupon: coupon.idcoupon,
                    menuname: coupon.menuname,
                    unit: coupon.unit,
                    description: `คูปองถูกใช้โดยพนักงาน ID: ${empid}`,
                    status_Cop: false
                }
            });
        });

        return res.status(200).json({
            success: true,
            message: "ใช้คูปองสำเร็จ",
            data: {
                couponCode: coupon_code,
                empid: empid,
                menuname: coupon.menuname,
                unit: coupon.unit
            }
        });

    } catch (error) {
        console.error("Error in redeemCouponByCode:", error);
        return res.status(500).json({ success: false, message: "เกิดข้อผิดพลาดในการใช้คูปอง" });
    }
};

// ดึงข้อมูล CouponHistory ทั้งหมดจาก DB
exports.getLogusecoupon = async (req, res) => {
    try {
        const logs = await prisma.couponHistory.findMany({
            orderBy: { createdat: "desc" } // เรียงจากล่าสุดไปเก่า
        });

        return res.status(200).json({
            status: "Success",
            message: logs.length > 0 
                ? "ดึงข้อมูลประวัติการใช้งานคูปองสำเร็จ" 
                : "ยังไม่มีประวัติการใช้งานคูปอง",
            totalLogs: logs.length,
            logs: logs // ส่งออกตรง ๆ ทั้งหมดจาก DB
        });

    } catch (error) {
        console.error("Error fetching coupon logs:", error);
        return res.status(500).json({
            message: error.message || "เกิดข้อผิดพลาดในการดึงข้อมูลประวัติการใช้งานคูปอง"
        });
    }
};










