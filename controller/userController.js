// server/controller/userController.js

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const generateUid = require('../utils/generateUid');

// ฟังก์ชันสำหรับสร้าง UID ที่ไม่ซ้ำกัน
async function createUniqueUid() {
  let uid;
  let isUnique = false;
  
  while (!isUnique) {
    uid = generateUid();
    const exists = await prisma.user.findUnique({ where: { uid } });
    if (!exists) isUnique = true;
  }
  
  return uid;
}

// ฟังก์ชันสำหรับสร้างผู้ใช้ใหม่
async function createNewUser(userId, name, pictureUrl = null) {
  try {
    const uid = await createUniqueUid();
    console.log('DEBUG - createNewUser data:', { userId, name, pictureUrl, uid });
    const user = await prisma.user.create({
      data: { userId, name, pictureUrl, uid }
    });
    console.log('DEBUG - createNewUser result:', user);
    return user;
  } catch (err) {
    console.error('DEBUG - createNewUser error:', err);
    throw err;
  }
}

// สร้างผู้ใช้จาก Line API
exports.createUser = async (req, res) => {
  console.log('DEBUG - createUser called with body:', req.body);
  const { userId, displayName, pictureUrl } = req.body;

  if (!userId || !displayName) {
    console.log('DEBUG - Missing required fields');
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    // ตรวจสอบว่ามีผู้ใช้อยู่แล้วหรือไม่ (lookup by userId)
    let user = await prisma.user.findUnique({ where: { userId } });
    console.log('DEBUG - User exists?', !!user);

    // ถ้าไม่มีให้สร้างใหม่
    if (!user) {
      user = await createNewUser(userId, displayName, pictureUrl);
      console.log('DEBUG - Created new user:', user);
    }

    // คืนข้อมูลกลับโดย map name → displayName
    return res.status(200).json({
      uid: user.uid,
      displayName: user.name,
      role: user.role,
      userpoint: user.userpoint,
      isActive: user.isActive
    });
  } catch (error) {
    console.error('DEBUG - Error in saving user:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// ฟังก์ชันดึงข้อมูลผู้ใช้ตาม identifier (และสร้างใหม่ถ้าไม่พบ)
exports.getUser = async (req, res) => {
  console.log('DEBUG - getUser called with params:', req.params);
  console.log('DEBUG - getUser query parameters:', req.query);
  
  const { identifier } = req.params;

  if (!identifier) {
    console.log('DEBUG - Missing user identifier');
    return res.status(400).json({ error: 'Missing user identifier' });
  }

  try {
    // ค้นหาผู้ใช้ด้วย uid ก่อน
    console.log('DEBUG - Looking for user by uid:', identifier);
    let user = await prisma.user.findUnique({ where: { uid: identifier } });

    // ถ้าไม่เจอ ให้ค้นหาด้วย userId แทน
    if (!user) {
      console.log('DEBUG - User not found by uid, looking by userId:', identifier);
      user = await prisma.user.findUnique({ where: { userId: identifier } });
    }

    console.log('DEBUG - User found?', !!user);

    // ถ้ายังไม่เจอผู้ใช้ และมี name จาก query → สร้างใหม่
    if (!user) {
      console.log('DEBUG - User not found, checking for name in query');
      
      const nameFromQuery = req.query.name;
      if (!nameFromQuery) {
        console.log('DEBUG - No name provided in query for new user');
        return res.status(400).json({ error: 'Name is required for new user' });
      }
      
      console.log('DEBUG - Creating new user with name from query:', nameFromQuery);
      const pictureUrl = req.query.picture || null;
      user = await createNewUser(identifier, nameFromQuery, pictureUrl);
      console.log('DEBUG - Created new user:', user);
    }

    // กรองข้อมูลที่จะส่งกลับ
    const { uid, userId, name, pictureUrl, role, userpoint, isActive } = user;
    return res.status(200).json({
      uid,
      userId,
      displayName: name,
      pictureUrl,
      role,
      userpoint,
      isActive
    });
  } catch (error) {
    console.error('DEBUG - Error fetching or creating user:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
