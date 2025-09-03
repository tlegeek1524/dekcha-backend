const jwt = require("jsonwebtoken");

exports.authenticateEmployee = (req, res, next) => {
  try {
    const token = req.cookies?.AuthToken;
    
    if (!token) {
      return res.status(401).json({ 
        message: "ไม่พบ AuthToken กรุณาเข้าสู่ระบบ" 
      });
    }

    // ตรวจสอบ JWT Token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // ตรวจสอบว่ามีข้อมูลที่จำเป็น
    if (!decoded.empid) {
      return res.status(401).json({ 
        message: "Token ไม่มีข้อมูล empid" 
      });
    }

    // เก็บข้อมูลพนักงานใน req object
    req.employee = { 
      empid: decoded.empid, 
      name: decoded.name || 'ไม่ระบุชื่อ',
      role: decoded.role || null,
      department: decoded.department || null
    };
    
    next();
    
  } catch (err) {
    console.error("JWT Authentication Error:", err.message);
    
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: "Token ไม่ถูกต้อง" });
    } else if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: "Token หมดอายุแล้ว" });
    } else {
      return res.status(401).json({ message: "การตรวจสอบสิทธิ์ล้มเหลว" });
    }
  }
};