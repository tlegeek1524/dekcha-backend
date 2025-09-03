// middlewares/authMiddleware.js
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET;  // ใช้ JWT_SECRET เดียวกันจาก Controller

// Middleware ตรวจสอบ JWT token
function authenticateJWT(req, res, next) {
  const token = req.cookies.token || req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ error: 'Token is required' });
  }

  // ตรวจสอบว่า token เป็นของจริงไหม
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }

    // ใส่ข้อมูล user ใน request เพื่อใช้ใน routes ต่อไป
    req.user = user;
    next();
  });
}

module.exports = {
  authenticateJWT,
};
