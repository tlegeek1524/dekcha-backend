const express = require('express');
const router = express.Router();
const PointManageController = require('../controller/pointmanageController');
const { authenticateEmployee } = require('../middleware/employeeAuth');

// Debug middleware เพื่อดูข้อมูลที่ส่งเข้ามา
const debugRequest = (req, res, next) => {
  console.log('\n=== 🔍 DEBUG REQUEST ===');
  console.log('📍 URL:', req.originalUrl);
  console.log('🎯 Method:', req.method);
  console.log('🌐 Headers:', JSON.stringify(req.headers, null, 2));
  console.log('🍪 Raw Cookies:', req.headers.cookie);
  console.log('🍪 Parsed Cookies:', req.cookies);
  console.log('📦 Body:', req.body);
  console.log('🔗 Query:', req.query);
  console.log('========================\n');
  next();
};

// Middleware เฉพาะสำหรับ log การเพิ่มแต้ม
const logPointTransaction = (req, res, next) => {
  console.log('\n=== 📊 POINT TRANSACTION LOG ===');
  console.log('👤 Employee:', req.employee?.empid || 'Unknown');
  console.log('🎯 Customer Info:', req.body?.customer_info);
  console.log('⭐ Points to Add:', req.body?.userpoint);
  console.log('📝 Note:', req.body?.note || 'No note');
  console.log('⏰ Timestamp:', new Date().toISOString());
  console.log('===============================\n');
  next();
};

/**
 * API สำหรับเพิ่มแต้มให้ลูกค้า
 * เฉพาะพนักงานเท่านั้น
 * รวมการบันทึก PointLog อัตโนมัติ
 */

// POST /api/points/add - เพิ่มแต้มให้ลูกค้า (มีการ saveLog อัตโนมัติ)
router.post('/add', 
  debugRequest, 
  authenticateEmployee, 
  logPointTransaction,
  PointManageController.savePointLog,
  PointManageController.addPointsToCustomer
);

// ✅ เพิ่ม API ดึงข้อมูล point logs ด้วย uid
// GET /api/points/get-point-log/uid
router.get('/get-point-log/:uid',PointManageController.getPointLogsByUid);
router.get('/get-all-point-logs', PointManageController.getAllPointLogs);
module.exports = router;
