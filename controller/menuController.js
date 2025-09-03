const { PrismaClient } = require('@prisma/client');
const prisma = require('../utils/prisma');

// ฟังก์ชันสร้าง idmenu แบบ TEA_xxxxxx
const generateMenuId = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let id = '';
  for (let i = 0; i < 6; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `TEA_${id}`;
};

exports.createMenu = async (req, res) => {
  try {
    const { idmenu, name, point, category, date, exp, status, image } = req.body;

    console.log('Received data:', { idmenu, name, point, category, date, exp, status, image: image ? 'Image provided' : 'No image' });

    // ตรวจสอบข้อมูลที่จำเป็น
    if (!name || !point || !category || !date || !exp) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        details: 'name, point, category, date, exp are required'
      });
    }

    // ตรวจสอบว่า point เป็นตัวเลขที่ถูกต้อง
    if (isNaN(point) || parseInt(point) <= 0) {
      return res.status(400).json({ 
        error: 'Invalid point value',
        details: 'Point must be a positive number'
      });
    }

    // ตรวจสอบวันที่
    const startDate = new Date(date);
    const expDate = new Date(exp);
    
    if (isNaN(startDate.getTime()) || isNaN(expDate.getTime())) {
      return res.status(400).json({ 
        error: 'Invalid date format',
        details: 'Date and exp must be valid dates'
      });
    }

    if (expDate <= startDate) {
      return res.status(400).json({ 
        error: 'Invalid date range',
        details: 'Expiration date must be after start date'
      });
    }

    // ✅ ใช้ generateMenuId() สร้าง idmenu
    let finalIdMenu = generateMenuId();
    let finalName = name.trim();

    // ตรวจสอบ idmenu และ name ซ้ำ
    let existingMenu = await prisma.menu.findFirst({
      where: {
        OR: [
          { idmenu: finalIdMenu },
          { name: finalName }
        ]
      }
    });

    // ถ้ามี idmenu ซ้ำให้ generate ใหม่จนกว่าจะไม่ซ้ำ
    while (existingMenu && existingMenu.idmenu === finalIdMenu) {
      finalIdMenu = generateMenuId();
      existingMenu = await prisma.menu.findFirst({
        where: { idmenu: finalIdMenu }
      });
    }

    if (existingMenu && existingMenu.name === finalName) {
      return res.status(409).json({ 
        error: 'Menu name already exists',
        details: `Menu with name "${finalName}" already exists`
      });
    }

    console.log('Using idmenu:', finalIdMenu);

    // สร้างข้อมูลเมนูใหม่
    const menuData = {
      idmenu: finalIdMenu,
      name: finalName,
      point: parseInt(point),
      category: category.trim(),
      date: startDate,
      exp: expDate,
      status: status !== undefined ? parseInt(status) : 1
    };

    if (image && image.trim()) {
      menuData.image = image.trim();
    }

    console.log('Creating menu with data:', { 
      ...menuData, 
      image: menuData.image ? 'Image provided' : 'No image' 
    });

    // ใช้ Raw SQL เพื่อ insert
    if (image && image.trim()) {
      await prisma.$executeRaw`
        INSERT INTO menu (idmenu, name, point, category, date, exp, status, image)
        VALUES (${finalIdMenu}, ${finalName}, ${parseInt(point)}, ${category.trim()}, ${startDate}, ${expDate}, ${parseInt(status) || 1}, ${image.trim()})
      `;
    } else {
      await prisma.$executeRaw`
        INSERT INTO menu (idmenu, name, point, category, date, exp, status)
        VALUES (${finalIdMenu}, ${finalName}, ${parseInt(point)}, ${category.trim()}, ${startDate}, ${expDate}, ${parseInt(status) || 1})
      `;
    }

    // ดึงข้อมูลที่เพิ่งสร้าง
    const newMenu = await prisma.menu.findFirst({
      where: { idmenu: finalIdMenu }
    });

    if (!newMenu) {
      throw new Error('Failed to retrieve created menu');
    }

    console.log('Menu created successfully with auto ID:', newMenu.id, 'and idmenu:', newMenu.idmenu);

    res.status(201).json({
      success: true,
      message: 'Menu created successfully',
      data: newMenu
    });

  } catch (error) {
    console.error('Error creating menu:', error);

    if (error.message.includes('duplicate') || error.code === 'P2002') {
      try {
        await prisma.$executeRaw`
          SELECT setval(pg_get_serial_sequence('menu', 'id'), (SELECT MAX(id) FROM menu) + 1, false);
        `;
        return res.status(500).json({
          error: 'Auto-increment sequence was corrupted and has been reset',
          details: 'Please try creating the menu again'
        });
      } catch (resetError) {
        console.error('Failed to reset sequence:', resetError);
      }
    }

    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message
    });
  }
};


// เพิ่มฟังก์ชัน debug เพื่อดู database state
exports.debugDatabase = async (req, res) => {
  try {
    // ดูข้อมูลล่าสุด
    const lastMenus = await prisma.menu.findMany({
      orderBy: { id: 'desc' },
      take: 5
    });

    // ดู auto increment sequence (PostgreSQL)
    const sequenceInfo = await prisma.$queryRaw`
      SELECT last_value, is_called FROM pg_get_serial_sequence('menu', 'id')::regclass;
    `;

    // ดู max id
    const maxId = await prisma.$queryRaw`
      SELECT MAX(id) as max_id FROM menu;
    `;

    res.json({
      lastMenus,
      sequenceInfo,
      maxId,
      message: 'Database debug info'
    });
  } catch (error) {
    console.error('Debug error:', error);
    res.status(500).json({ error: error.message });
  }
};

// ฟังก์ชันอื่น ๆ เหมือนเดิม...
exports.getMenuById = async (req, res) => {
  try {
    const menu = await prisma.menu.findFirst({
      where: { idmenu: req.params.idmenu }
    });

    if (!menu) {
      return res.status(404).json({ error: 'Menu not found' });
    }

    res.json(menu);
  } catch (error) {
    console.error('Error retrieving menu:', error);
    res.status(500).json({ error: 'Error retrieving menu', detail: error.message });
  }
};

exports.getAllMenus = async (req, res) => {
  try {
    const menus = await prisma.menu.findMany({
      orderBy: { id: 'desc' }
    });
    
    console.log(`Retrieved ${menus.length} menus`);
    res.json(menus);
  } catch (error) {
    console.error('Error retrieving menus:', error);
    res.status(500).json({ error: 'Error retrieving menus', detail: error.message });
  }
};

exports.deleteMenu = async (req, res) => {
  try {
    const { idmenu } = req.params;
    
    const existingMenu = await prisma.menu.findFirst({
      where: { idmenu }
    });

    if (!existingMenu) {
      return res.status(404).json({ error: 'Menu not found' });
    }

    await prisma.menu.delete({
      where: { id: existingMenu.id }
    });

    console.log(`Menu ${idmenu} (ID: ${existingMenu.id}) deleted successfully`);
    res.json({ 
      success: true,
      message: 'Menu deleted successfully',
      deletedId: idmenu
    });
  } catch (error) {
    console.error('Error deleting menu:', error);
    res.status(500).json({ error: 'Error deleting menu', detail: error.message });
  }
};

exports.updateMenu = async (req, res) => {
  const { name, point, category, date, exp, status, image } = req.body;
  const idmenu = req.params.idmenu;

  try {
    const existing = await prisma.menu.findFirst({
      where: { idmenu }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Menu not found' });
    }

    const updateData = {};
    
    if (name) updateData.name = name.trim();
    if (point) updateData.point = parseInt(point);
    if (category) updateData.category = category.trim();
    if (date) updateData.date = new Date(date);
    if (exp) updateData.exp = new Date(exp);
    if (status !== undefined) updateData.status = parseInt(status);
    if (image !== undefined) updateData.image = image;

    const updatedMenu = await prisma.menu.update({
      where: { id: existing.id },
      data: updateData
    });

    console.log(`Menu ${idmenu} updated successfully`);

    res.json({
      success: true,
      message: 'Menu updated successfully',
      data: updatedMenu
    });
  } catch (error) {
    console.error('Error updating menu:', error);
    res.status(500).json({ error: 'Error updating menu', detail: error.message });
  }
};

module.exports = {
  createMenu: exports.createMenu,
  getMenuById: exports.getMenuById,
  getAllMenus: exports.getAllMenus,
  deleteMenu: exports.deleteMenu,
  updateMenu: exports.updateMenu,
  debugDatabase: exports.debugDatabase
};