const express = require('express');
const router = express.Router();
const menuController = require('../controller/menuController');

router.post('/', menuController.createMenu);
router.get('/:idmenu', menuController.getMenuById);
router.delete('/:idmenu', menuController.deleteMenu);
router.put('/update/:idmenu', menuController.updateMenu);

module.exports = router;