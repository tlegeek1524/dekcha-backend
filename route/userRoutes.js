const express = require('express');
const router = express.Router();
const { createUser, getUser,getAllUsers,updatePhoneNumber} = require('../controller/userController');


// POST /api/users - สร้างผู้ใช้ใหม่
router.post('/', createUser);

// GET /api/users/all - ดึงข้อมูลผู้ใช้ทั้งหมด
router.get('/all', getAllUsers);

// GET /api/users/:identifier - ดึงข้อมูลผู้ใช้ตาม identifier
router.get('/:identifier', getUser);

// POST /api/users/phonenumber/:uid - อัปเดตเบอร์โทรศัพท์ของผู้ใช้
router.post('/phonenumber/:uid', updatePhoneNumber);

module.exports = router;
