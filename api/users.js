const express = require('express');
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken'); // เพิ่มเพื่อตรวจสอบ Token
const cookieParser = require('cookie-parser'); // เพิ่มเพื่อจัดการ Cookies
const router = express.Router();

const prisma = new PrismaClient();

// Middleware เพื่อตรวจสอบ Token จาก Cookie
const verifyToken = (req, res, next) => {
  const token = req.cookies.authToken; // ดึง Token จาก Cookie
  if (!token) {
    return res.status(401).json({ error: 'Token not found' });
  }

  try {
    // ตรวจสอบว่า Token ถูกต้อง (สมมติว่าเป็น JWT)
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId; // เก็บ userId จาก Token เพื่อใช้ต่อ
    next();
  } catch (err) {
    console.error('Token verification failed:', err);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// POST /login - สร้างและตั้งค่า HttpOnly Cookie สำหรับ Token
router.post('/login', async (req, res) => {
  const { idToken } = req.body;

  try {
    // สมมติว่า idToken จาก LINE LIFF ถูกส่งมา
    if (!idToken) {
      return res.status(400).json({ error: 'ID Token is required' });
    }

    // ตรวจสอบ idToken กับ LINE (ในกรณีจริงต้องเรียก LINE API)
    // ที่นี่สมมติว่า idToken ถูกต้องและมี userId
    const userId = 'decoded_user_id_from_line'; // แทนด้วยการ decode idToken จริง
    const token = jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '1d' });

    // ตั้งค่า HttpOnly Cookie
    res.cookie('authToken', token, {
      httpOnly: true, // ป้องกันการเข้าถึงจาก JavaScript
      secure: process.env.NODE_ENV === 'production', // HTTPS ใน production
      sameSite: 'strict', // ป้องกัน CSRF
      maxAge: 24 * 60 * 60 * 1000 // 1 วัน
    });

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Error in login:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// POST /users - บันทึกข้อมูลผู้ใช้
router.post('/', verifyToken, async (req, res) => {
  const { userId, displayName, pictureUrl, statusMessage } = req.body;

  try {
    // ตรวจสอบว่า userId ตรงกับ Token
    if (userId !== req.userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // บันทึกหรืออัปเดตผู้ใช้ในฐานข้อมูล
    const user = await prisma.user.upsert({
      where: { userId },
      update: { name: displayName, pictureUrl, statusMessage },
      create: { userId, name: displayName, pictureUrl, statusMessage, userpoint: 0 },
    });

    return res.status(200).json({
      uid: user.userId,
      name: user.name,
      pictureUrl: user.pictureUrl,
      userpoint: user.userpoint,
    });
  } catch (err) {
    console.error('Error saving user:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// GET /users/:userId - ดึงข้อมูลผู้ใช้จากฐานข้อมูล
router.get('/:userId', verifyToken, async (req, res) => {
  const { userId } = req.params;

  // ตรวจสอบว่า userId ตรงกับ Token
  if (userId !== req.userId) {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { userId },
    });

    if (!user) {
      return res.status(404).json({ error: 'ไม่พบผู้ใช้' });
    }

    return res.status(200).json({
      uid: user.userId,
      name: user.name,
      pictureUrl: user.pictureUrl,
      userpoint: user.userpoint,
    });
  } catch (err) {
    console.error('Error fetching user:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Cleanup Prisma client
router.use(async (req, res, next) => {
  await prisma.$disconnect();
});

module.exports = router;