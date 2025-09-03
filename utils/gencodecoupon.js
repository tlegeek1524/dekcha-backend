// utils/gencodecoupon.js

// ฟังก์ชันสุ่มโค้ดคูปอง
function generateCouponCode(length = 6) {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let result = "";
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

// ฟังก์ชันตรวจสอบโค้ดไม่ซ้ำภายใน userId
async function genCodeCoupon(prisma, uid, length = 6) {
    let code;
    let exists = true;

    while (exists) {
        code = generateCouponCode(length);
        const existing = await prisma.userCoupon.findFirst({
            where: {
                uid: uid,
                code_cop: code
            }
        });
        exists = !!existing; // ถ้าเจอว่ามีอยู่แล้ว จะสุ่มใหม่
    }

    return code;
}

module.exports = {
    genCodeCoupon
};
