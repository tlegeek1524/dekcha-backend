const express = require('express');
const router = express.Router();
const listmenuController = require('../controller/listmenuController');
const menuController = require('../controller/menuController');

// รายการเมนูทั้งหมดพร้อมคำนวณเปอร์เซ็นต์ของ userpoint
router.get('/list/:userId', listmenuController.getMenuListWithPoints);

// รายการเมนูตามประเภท (category) พร้อมคำนวณเปอร์เซ็นต์
router.get('/category/:userId/:category', listmenuController.getMenuByCategory);

// รายละเอียดของเมนูเดียวพร้อมข้อมูลการแลกคะแนน
router.get('/details/:userId/:menuId', listmenuController.getMenuDetails);

// รายการเมนูแนะนำ
router.get('/recommended/:userId', listmenuController.getRecommendedMenu);

// API หลักของเมนู (ใช้ menuController ที่มีอยู่แล้ว)
router.post('/', menuController.createMenu);
router.get('/:idmenu', menuController.getMenuById);
router.delete('/:idmenu', menuController.deleteMenu);
router.get('/', menuController.getAllMenus);

module.exports = router;