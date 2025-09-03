// controllers/authController.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const JWT_SECRET = process.env.JWT_SECRET;

// ฟังก์ชัน login
async function loginUser(req, res) {
  try {
    const { empid, phone_emp, password_emp } = req.body;

    // ตรวจสอบว่าผู้ใช้กรอกรหัสผ่านและกรอกทั้ง empid หรือ phone_emp
    if (!password_emp || (!empid && !phone_emp)) {
      return res.status(400).json({ error: 'empid, phone_emp, and password_emp are required' });
    }

    let user;

    // หาข้อมูลพนักงานจากฐานข้อมูล โดยตรวจสอบจาก empid หรือ phone_emp
    if (empid) {
      user = await prisma.empuser.findUnique({ where: { empid } });
    } else if (phone_emp) {
      user = await prisma.empuser.findFirst({ where: { phone_emp } });
    }

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // เช็คว่า password ที่กรอกมาถูกต้องไหม
    const isValid = await bcrypt.compare(password_emp, user.password_emp);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // สร้าง JWT token
    const token = jwt.sign(
      { userId: user.id, empid: user.empid, role: user.role},
      JWT_SECRET,
      { expiresIn: 43200 }
    );

    // เก็บ JWT token ใน cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Strict',
    });

    // ส่งข้อมูลพร้อมกับ token กลับไป
    res.json({
      status: 'OK',
      message: 'Login successful',
      token: token,
      empuser: {
        empid: user.empid,
        name: user.name_emp,
        firstname: user.firstname_emp,
        lastname: user.lastname_emp,
        role: user.role,
        // lastLogin: user.lastLogin,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// ฟังก์ชันตรวจสอบ token
async function verifyToken(req, res) {
  try {
    // Debug: ดูข้อมูล cookies และ headers
    console.log('req.cookies:', req.cookies);
    console.log('req.headers.authorization:', req.headers.authorization);
    
    // ดึง token จาก cookie หรือ Authorization header
    let token = req.cookies?.token || req.headers.authorization?.split(' ')[1];
    
    console.log('Token from cookie:', req.cookies?.token);
    console.log('Token from header:', req.headers.authorization?.split(' ')[1]);
    console.log('Final token:', token);
    
    if (!token) {
      console.log('No token found');
      return res.status(401).json({ error: 'No token provided' });
    }

    // ตรวจสอบและ decode token
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // หาข้อมูลผู้ใช้จากฐานข้อมูล
    const user = await prisma.empuser.findUnique({
      where: { empid: decoded.empid },
      select: {
        empid: true,
        name_emp: true,
        firstname_emp: true,
        lastname_emp: true,
        pincode_emp: true,
        role: true,
        //lastLogin: true,
      },
    });

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    // ส่งข้อมูลผู้ใช้กลับไป
    res.json({
      status: 'OK',
      message: 'Token is valid',
      token: token,
      user: {
        empid: user.empid,
        name: user.name_emp,
        firstname: user.firstname_emp,
        lastname: user.lastname_emp,
        pincode: user.pincode_emp,
        role: user.role,
        //lastLogin: user.lastLogin,
      },
    });
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// ฟังก์ชันสำหรับดึงข้อมูล employee ทุกคน (เฉพาะ admin เท่านั้น)
async function getAllEmployees(req, res) {
  try {
    // ดึง token จาก cookie หรือ Authorization header
    let token = req.cookies?.token || req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'ไม่พบ token' });
    }

    // ตรวจสอบและ decode token
    const decoded = jwt.verify(token, JWT_SECRET);

    // ตรวจสอบ role ของผู้ใช้
    const currentUser = await prisma.empuser.findUnique({
      where: { empid: decoded.empid },
      select: { role: true }
    });

    if (!currentUser || currentUser.role !== 'admin') {
      return res.status(403).json({ error: 'เข้าถึงไม่ได้: เฉพาะผู้ดูแลระบบเท่านั้น' });
    }

    // ดึงข้อมูล employee ทุกคน
    const employees = await prisma.empuser.findMany({
      select: {
        empid: true,
        name_emp: true,
        firstname_emp: true,
        lastname_emp: true,
        pincode_emp: true,
        role: true,
      }
    });

    res.json({
      status: 'OK',
      employees: employees
    });
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token หมดอายุ' });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Token ไม่ถูกต้อง' });
    }
    console.error(error);
    res.status(500).json({ error: 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้' });
  }
}

// ฟังก์ชันสำหรับดึงข้อมูล user (ลูกค้าทุกคน) เฉพาะ admin เท่านั้น
async function getAllCustomerUsers(req, res) {
  try {
    // ดึง token จาก cookie หรือ Authorization header
    let token = req.cookies?.token || req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'ไม่พบ token' });
    }

    // ตรวจสอบและ decode token
    const decoded = jwt.verify(token, JWT_SECRET);

    // ตรวจสอบ role ของผู้ใช้ (empuser)
    const currentUser = await prisma.empuser.findUnique({
      where: { empid: decoded.empid },
      select: { role: true }
    });

    if (!currentUser || currentUser.role !== 'admin') {
      return res.status(403).json({ error: 'เข้าถึงไม่ได้: เฉพาะผู้ดูแลระบบเท่านั้น' });
    }

    // ดึงข้อมูล user ทุกคน (model user)
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        uid: true,
        role: true,
        userpoint: true,
        phonenumber: true,
        isactive: true,
        createdat: true,
        updatedat: true
      }
    });

    res.json({
      status: 'Success',
      message: 'ดึงข้อมูลผู้ใช้สำเร็จ',
      users: users
    });
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token หมดอายุ' });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Token ไม่ถูกต้อง' });
    }
    console.error(error);
    res.status(500).json({ error: 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้' });
  }
}



module.exports = {
  loginUser,
  verifyToken,
  getAllEmployees,
  getAllCustomerUsers, // เพิ่มฟังก์ชันนี้เข้าไปใน exports
};