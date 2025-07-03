const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * ดึงรายการเมนูทั้งหมดพร้อมคำนวณเปอร์เซ็นต์ของ userpoint เทียบกับ point ของเมนู
 */
exports.getMenuListWithPoints = async (req, res) => {
  try {
    const userId = req.params.userId;

    // ตรวจสอบว่ามี userId หรือไม่
    if (!userId) {
      return res.status(400).json({ error: 'Missing user ID' });
    }

    // ดึงข้อมูลผู้ใช้
    const user = await prisma.user.findFirst({
      where: { userId: userId }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // ดึงรายการเมนูทั้งหมดที่มีสถานะเป็น active
    const menuItems = await prisma.menu.findMany({
      where: {
        status: true,
        exp: {
          gte: new Date() // เลือกเฉพาะเมนูที่ยังไม่หมดอายุ
        }
      },
      orderBy: {
        point: 'asc' // เรียงลำดับตามคะแนนน้อยไปมาก
      }
    });

    // คำนวณเปอร์เซ็นต์สำหรับแต่ละเมนู
    const menuWithPercentage = menuItems.map(menu => {
      const pointPercentage = user.userpoint > 0 ? (user.userpoint / menu.point) * 100 : 0;
      const formattedPercentage = parseFloat(pointPercentage.toFixed(2));
      
      // คำนวณวันที่เหลือก่อนหมดอายุ
      const currentDate = new Date();
      const expDate = new Date(menu.exp);
      const daysRemaining = Math.ceil((expDate - currentDate) / (1000 * 60 * 60 * 24));
      
      return {
        ...menu,
        daysRemaining: daysRemaining > 0 ? daysRemaining : 0,
        pointPercentage: formattedPercentage,
        isRedeemable: user.userpoint >= menu.point
      };
    });

    return res.status(200).json({
      userId: user.userId,
      userPoint: user.userpoint,
      menuItems: menuWithPercentage
    });
  } catch (error) {
    console.error('Error getting menu list with points:', error);
    return res.status(500).json({ error: 'Internal server error', detail: error.message });
  }
};

/**
 * ดึงรายการเมนูตามประเภท (category) พร้อมคำนวณเปอร์เซ็นต์
 */
exports.getMenuByCategory = async (req, res) => {
  try {
    const { userId, category } = req.params;

    // ตรวจสอบว่ามีข้อมูลที่จำเป็นหรือไม่
    if (!userId || !category) {
      return res.status(400).json({ error: 'Missing user ID or category' });
    }

    // ดึงข้อมูลผู้ใช้
    const user = await prisma.user.findFirst({
      where: { userId: userId }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // ดึงรายการเมนูตามประเภท
    const menuItems = await prisma.menu.findMany({
      where: {
        category: category,
        status: true,
        exp: {
          gte: new Date()
        }
      },
      orderBy: {
        point: 'asc'
      }
    });

    // คำนวณเปอร์เซ็นต์สำหรับแต่ละเมนู
    const menuWithPercentage = menuItems.map(menu => {
      const pointPercentage = user.userpoint > 0 ? (user.userpoint / menu.point) * 100 : 0;
      const formattedPercentage = parseFloat(pointPercentage.toFixed(2));
      
      const currentDate = new Date();
      const expDate = new Date(menu.exp);
      const daysRemaining = Math.ceil((expDate - currentDate) / (1000 * 60 * 60 * 24));
      
      return {
        ...menu,
        daysRemaining: daysRemaining > 0 ? daysRemaining : 0,
        pointPercentage: formattedPercentage,
        isRedeemable: user.userpoint >= menu.point
      };
    });

    return res.status(200).json({
      userId: user.userId,
      category: category,
      userPoint: user.userpoint,
      menuItems: menuWithPercentage
    });
  } catch (error) {
    console.error('Error getting menu by category:', error);
    return res.status(500).json({ error: 'Internal server error', detail: error.message });
  }
};

/**
 * ดึงรายละเอียดของเมนูเดียวพร้อมข้อมูลการแลกคะแนน
 */
exports.getMenuDetails = async (req, res) => {
  try {
    const { userId, menuId } = req.params;

    // ตรวจสอบว่ามีข้อมูลที่จำเป็นหรือไม่
    if (!userId || !menuId) {
      return res.status(400).json({ error: 'Missing user ID or menu ID' });
    }

    // ดึงข้อมูลผู้ใช้
    const user = await prisma.user.findFirst({
      where: { userId: userId }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // ดึงรายละเอียดเมนู
    const menu = await prisma.menu.findUnique({
      where: { idmenu: menuId }
    });

    if (!menu) {
      return res.status(404).json({ error: 'Menu item not found' });
    }

    // คำนวณเปอร์เซ็นต์และข้อมูลเพิ่มเติม
    const pointPercentage = user.userpoint > 0 ? (user.userpoint / menu.point) * 100 : 0;
    const formattedPercentage = parseFloat(pointPercentage.toFixed(2));
    
    const currentDate = new Date();
    const expDate = new Date(menu.exp);
    const daysRemaining = Math.ceil((expDate - currentDate) / (1000 * 60 * 60 * 24));
    
    const pointsNeeded = Math.max(0, menu.point - user.userpoint);
    
    const menuWithDetails = {
      ...menu,
      daysRemaining: daysRemaining > 0 ? daysRemaining : 0,
      pointPercentage: formattedPercentage,
      isRedeemable: user.userpoint >= menu.point,
      pointsNeeded: pointsNeeded,
      userPoint: user.userpoint
    };

    return res.status(200).json(menuWithDetails);
  } catch (error) {
    console.error('Error getting menu details:', error);
    return res.status(500).json({ error: 'Internal server error', detail: error.message });
  }
};

/**
 * ดึงรายการเมนูแนะนำ (อาจจะเป็นเมนูที่แลกได้, เมนูใหม่, หรือกำลังจะหมดเวลา)
 */
exports.getRecommendedMenu = async (req, res) => {
  try {
    const userId = req.params.userId;

    // ตรวจสอบว่ามี userId หรือไม่
    if (!userId) {
      return res.status(400).json({ error: 'Missing user ID' });
    }

    // ดึงข้อมูลผู้ใช้
    const user = await prisma.user.findFirst({
      where: { userId: userId }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const currentDate = new Date();
    
    // เมนูที่แลกได้ทันที (userpoint >= point)
    const redeemableItems = await prisma.menu.findMany({
      where: {
        status: true,
        point: { lte: user.userpoint },
        exp: { gte: currentDate }
      },
      take: 5,
      orderBy: { point: 'desc' }
    });
    
    // เมนูที่กำลังจะหมดเวลา (ภายใน 7 วัน)
    const sevenDaysLater = new Date(currentDate);
    sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);
    
    const expiringItems = await prisma.menu.findMany({
      where: {
        status: true,
        exp: {
          gte: currentDate,
          lte: sevenDaysLater
        }
      },
      take: 3,
      orderBy: { exp: 'asc' }
    });
    
    // เมนูใหม่ (เพิ่มมาภายใน 14 วัน)
    const fourteenDaysAgo = new Date(currentDate);
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
    
    const newItems = await prisma.menu.findMany({
      where: {
        status: true,
        date: { gte: fourteenDaysAgo },
        exp: { gte: currentDate }
      },
      take: 3,
      orderBy: { date: 'desc' }
    });
    
    // เพิ่มข้อมูลเปอร์เซ็นต์และรายละเอียดเพิ่มเติม
    const processedRedeemable = redeemableItems.map(item => {
      const pointPercentage = (user.userpoint / item.point) * 100;
      const daysRemaining = Math.ceil((new Date(item.exp) - currentDate) / (1000 * 60 * 60 * 24));
      
      return {
        ...item,
        daysRemaining: daysRemaining > 0 ? daysRemaining : 0,
        pointPercentage: parseFloat(pointPercentage.toFixed(2)),
        isRedeemable: true
      };
    });
    
    const processedExpiring = expiringItems.map(item => {
      const pointPercentage = user.userpoint > 0 ? (user.userpoint / item.point) * 100 : 0;
      const daysRemaining = Math.ceil((new Date(item.exp) - currentDate) / (1000 * 60 * 60 * 24));
      
      return {
        ...item,
        daysRemaining: daysRemaining > 0 ? daysRemaining : 0,
        pointPercentage: parseFloat(pointPercentage.toFixed(2)),
        isRedeemable: user.userpoint >= item.point
      };
    });
    
    const processedNew = newItems.map(item => {
      const pointPercentage = user.userpoint > 0 ? (user.userpoint / item.point) * 100 : 0;
      const daysRemaining = Math.ceil((new Date(item.exp) - currentDate) / (1000 * 60 * 60 * 24));
      const daysActive = Math.ceil((currentDate - new Date(item.date)) / (1000 * 60 * 60 * 24));
      
      return {
        ...item,
        daysRemaining: daysRemaining > 0 ? daysRemaining : 0,
        daysActive: daysActive,
        pointPercentage: parseFloat(pointPercentage.toFixed(2)),
        isRedeemable: user.userpoint >= item.point
      };
    });

    return res.status(200).json({
      userId: user.userId,
      userPoint: user.userpoint,
      redeemableItems: processedRedeemable,
      expiringItems: processedExpiring,
      newItems: processedNew
    });
  } catch (error) {
    console.error('Error getting recommended menu:', error);
    return res.status(500).json({ error: 'Internal server error', detail: error.message });
  }
};