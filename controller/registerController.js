// controllers/userController.js
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const { generateUniqueEmpId } = require('../utils/empIdGenerator');

const prisma = new PrismaClient();

exports.registerUser = async (req, res) => {
  const { firstname_emp, lastname_emp, name_emp, pincode_emp, password_emp, email_emp, phone_emp } = req.body;

  try {
    // ตรวจสอบ email หรือ phone ซ้ำ
    const existingUser = await prisma.empuser.findFirst({
      where: {
        OR: [
          { email_emp },
          { phone_emp }
        ]
      }
    });

    if (existingUser) {
      return res.status(400).json({ error: 'Email or phone already exists' });
    }

    // สร้าง empid
    const empid = await generateUniqueEmpId();

    // hash password
    const hashedPassword = await bcrypt.hash(password_emp, 10);

    // บันทึกข้อมูล user
    const newUser = await prisma.empuser.create({
      data: {
        empid,
        firstname_emp,
        lastname_emp,
        name_emp,
        pincode_emp,
        password_emp: hashedPassword,
        email_emp,
        phone_emp
      }
    });

    res.status(201).json({ 
  status: 'OK',
  message: 'Register Successfully', 
});
  } catch (error) {
    res.status(500).json({ error: 'Error registering user', detail: error.message });
  }
};
