const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// เพิ่มข้อมูลเมนู
exports.createMenu = async (req, res) => {
  const { idmenu, name, point, category, date, exp, status } = req.body;

  try {
    const newMenu = await prisma.menu.create({
      data: {
        idmenu,
        name,
        point,
        category,
        date: new Date(date),
        exp: new Date(exp),
        status,
      },
    });
    res.status(201).json(newMenu);
  } catch (error) {
    res.status(500).json({ error: 'Error creating menu', detail: error.message });
  }
};

// แสดงข้อมูลเมนูตาม id
exports.getMenuById = async (req, res) => {
  try {
    const menu = await prisma.menu.findUnique({
      where: { idmenu: req.params.idmenu },
    });

    if (!menu) {
      return res.status(404).json({ error: 'Menu not found' });
    }

    res.json(menu);
  } catch (error) {
    res.status(500).json({ error: 'Error retrieving menu', detail: error.message });
  }
};

// ดึงข้อมูลเมนูทั้งหมด
exports.getAllMenus = async (req, res) => {
  try {
    const menus = await prisma.menu.findMany();
    res.json(menus);
  } catch (error) {
    res.status(500).json({ error: 'Error retrieving menus', detail: error.message });
  }
};

// ลบข้อมูลเมนูตาม idmenu (String)
exports.deleteMenu = async (req, res) => {
  try {
    await prisma.menu.delete({
      where: { idmenu: req.params.idmenu },
    });

    res.json({ message: 'Menu deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Error deleting menu', detail: error.message });
  }
};
