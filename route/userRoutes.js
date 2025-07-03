const express = require('express');
const router = express.Router();
const { createUser, getUser } = require('../controller/userController');

// POST /api/users - สร้างผู้ใช้ใหม่
router.post('/', createUser);

// GET /api/users/:identifier - ดึงข้อมูลผู้ใช้ตาม identifier
router.get('/:identifier', getUser);

module.exports = router;
