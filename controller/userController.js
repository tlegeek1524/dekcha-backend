const { PrismaClient, Prisma } = require('@prisma/client');
const prisma = new PrismaClient();
const generateUid = require('../utils/generateUid');

const MAX_UID_ATTEMPTS = 5;

// สร้าง user ใหม่พร้อม uid ที่ไม่ซ้ำ
function sanitizeInput(input) {
  if (!input) return null;
  return String(input).trim() || null;
}

// ฟังก์ชันตรวจสอบ URL รูปภาพ
function isValidPictureUrl(url) {
  if (!url) return false;
  try {
    const urlObj = new URL(url);
    return urlObj.protocol === 'https:' &&
      (urlObj.hostname.includes('line-scdn.net') ||
        urlObj.hostname.includes('profile.line-scdn.net'));
  } catch {
    return false;
  }
}

// ฟังก์ชันสร้าง User ใหม่
async function createNewUser(userid, displayName, pictureUrl = null) {
  // ทำความสะอาดข้อมูล
  const cleanUserid = sanitizeInput(userid);
  const cleanName = sanitizeInput(displayName);
  const cleanPicture = isValidPictureUrl(pictureUrl) ? pictureUrl : null;

  // ตรวจสอบข้อมูลจำเป็น
  if (!cleanUserid || !cleanName) {
    const error = new Error('userid และ displayName เป็นข้อมูลที่จำเป็น');
    error.status = 400;
    throw error;
  }

  // ตรวจสอบรูปแบบ LINE User ID
  if (!/^U[a-f0-9]{32}$/i.test(cleanUserid)) {
    const error = new Error('รูปแบบ LINE User ID ไม่ถูกต้อง');
    error.status = 400;
    throw error;
  }

  // ลองสร้าง User หลายครั้งกรณี UID ซ้ำ
  for (let attempt = 1; attempt <= MAX_UID_ATTEMPTS; attempt++) {
    try {
      const uid = generateUid();

      const user = await prisma.user.create({
        data: {
          userid: cleanUserid,
          name: cleanName,
          pictureurl: cleanPicture,
          uid: uid,
          userpoint: 0,
          role: 'user',
          isactive: true,
          phonenumber: null
        },
      });

      console.log(`✅ สร้าง User สำเร็จ: ${cleanName} (${cleanUserid})`);
      return user;

    } catch (error) {
      // กรณี UID ซ้ำ
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        console.warn(`⚠️ UID ซ้ำ attempt ${attempt}/${MAX_UID_ATTEMPTS}`);

        if (attempt === MAX_UID_ATTEMPTS) {
          const err = new Error('ไม่สามารถสร้าง UID ที่ไม่ซ้ำได้หลังจากพยายามหลายครั้ง');
          err.status = 500;
          throw err;
        }
        continue; // ลองใหม่
      }

      // กรณี userid ซ้ำ
      if (error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002' &&
        error.meta?.target?.includes('userid')) {
        const err = new Error('ผู้ใช้นี้มีอยู่ในระบบแล้ว');
        err.status = 409;
        throw err;
      }

      throw error;
    }
  }
}

// POST /api/users - สร้างหรือดึงข้อมูล User
exports.createUser = async (req, res) => {
  try {
    console.log('📝 Request Body:', req.body);

    // รับข้อมูลจาก Frontend (ตาม LINE Profile format)
    const { userId, displayName, pictureUrl } = req.body;

    // ตรวจสอบข้อมูลที่จำเป็น
    if (!userId || !displayName) {
      return res.status(400).json({
        error: 'ข้อมูลไม่ครบถ้วน',
        required: ['userId', 'displayName'],
        received: { userId: !!userId, displayName: !!displayName }
      });
    }

    // ตรวจสอบว่า User มีอยู่แล้วหรือไม่
    let existingUser = await prisma.user.findFirst({
      where: { userid: userId }
    });

    let user;
    if (existingUser) {
      console.log(`👤 พบ User เดิม: ${existingUser.name}`);
      user = existingUser;
    } else {
      console.log(`🆕 สร้าง User ใหม่: ${displayName}`);
      user = await createNewUser(userId, displayName, pictureUrl);
    }

    // ส่ง Response กลับ (รูปแบบที่ Frontend ต้องการ)
    const response = {
      uid: user.uid,
      name: user.name,
      userpoint: user.userpoint,
      role: user.role,
      isactive: user.isactive,
      pictureurl: user.pictureurl,
      phonenumber: user.phonenumber,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };

    console.log('✅ Response:', response);
    return res.status(200).json(response);

  } catch (error) {
    console.error('❌ createUser Error:', error);

    // ส่ง Error Response
    return res.status(error.status || 500).json({
      error: error.message || 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์',
      timestamp: new Date().toISOString()
    });
  }
};


// GET /user/:identifier → ดึง user หรือสร้างใหม่ถ้ามี query.name
exports.getUser = async (req, res) => {
  try {
    const { identifier } = req.params;
    if (!identifier) {
      return res.status(400).json({ error: 'Missing user identifier' });
    }

    let user = await prisma.user.findFirst({
      where: { OR: [{ uid: identifier }, { userid: identifier }] }
    });

    if (!user) {
      const nameFromQuery = req.query.name;
      if (!nameFromQuery) {
        return res.status(400).json({ error: 'Name is required for new user' });
      }
      user = await createNewUser(identifier, nameFromQuery, req.query.picture || null);
    }

    return res.status(200).json({
      uid: user.uid,
      userid: user.userid,
      displayName: user.name,
      pictureurl: user.pictureurl,
      role: user.role,
      userpoint: user.userpoint,
      phonenumber: user.phonenumber,
      isactive: user.isactive
    });
  } catch (error) {
    console.error('getUser error:', error);
    res.status(error.status || 500).json({ error: error.message || 'Internal server error' });
  }
};

// GET /users → ดึงทั้งหมด
exports.getAllUsers = async (req, res) => {
  try {
    const users = await prisma.user.findMany();
    res.status(200).json(users);
  } catch (error) {
    console.error('getAllUsers error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// PUT /user/phonenumber/:uid → อัปเดตเบอร์โทรศัพท์ของ user ตาม uid
exports.updatePhoneNumber = async (req, res) => {
  try {
    const { uid } = req.params;
    const { phonenumber } = req.body;

    if (!phonenumber) {
      return res.status(400).json({ error: 'ไม่พบเบอร์โทรศัพท์' });
    }

    // ตรวจสอบว่ามี user นี้หรือไม่
    const user = await prisma.user.findUnique({ where: { uid } });
    if (!user) {
      return res.status(404).json({ error: 'ไม่พบผู้ใช้' });
    }

    // ถ้ามี phonenumber อยู่แล้ว (เคยยืนยันแล้ว) ห้ามอัปเดตซ้ำ
    if (user.phonenumber) {
      // ถ้าเบอร์ที่ส่งมาตรงกับของตัวเอง
      if (user.phonenumber === phonenumber) {
        return res.status(409).json({ message: 'คุณลงทะเบียนเบอร์โทรนี้ไปแล้ว' });
      }
      // ถ้าไม่ตรง ให้แจ้งว่าเปลี่ยนไม่ได้
      return res.status(403).json({ message: 'คุณได้ลงทะเบียนเบอร์โทรศัพท์ไปแล้ว ไม่สามารถเปลี่ยนแปลงได้' });
    }

    // ตรวจสอบว่าเบอร์นี้ถูกใช้ไปแล้วหรือยัง (ยกเว้น user ตัวเอง)
    const phoneExists = await prisma.user.findFirst({
      where: {
        phonenumber,
        NOT: { uid }
      }
    });
    if (phoneExists) {
      return res.status(409).json({ message: 'เบอร์โทรนี้ถูกยืนยันไปแล้ว' });
    }

    // อัปเดตเบอร์โทรศัพท์
    const updatedUser = await prisma.user.update({
      where: { uid },
      data: { phonenumber }
    });

    res.status(200).json({
      uid: updatedUser.uid,
      phonenumber: updatedUser.phonenumber,
      message: 'อัปเดตเบอร์โทรศัพท์สำเร็จ'
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};
