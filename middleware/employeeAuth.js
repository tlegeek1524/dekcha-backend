const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const rateLimit = require('express-rate-limit');

const prisma = require('../utils/prisma');

// Rate limiting for authentication attempts
const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // limit each IP to 50 auth requests per windowMs
  message: {
    success: false,
    message: 'มีการพยายามเข้าสู่ระบบมากเกินไป กรุณาลองใหม่ในอีก 15 นาที',
    errorCode: 'TOO_MANY_AUTH_ATTEMPTS'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Validate JWT format (basic validation)
const isValidJWTFormat = (token) => {
  if (!token || typeof token !== 'string') return false;
  
  const parts = token.split('.');
  if (parts.length !== 3) return false;
  
  // Basic length and format check
  const base64UrlPattern = /^[A-Za-z0-9_-]+$/;
  return parts.every(part => part.length > 0 && base64UrlPattern.test(part)) && token.length >= 50;
};

// Extract token from request with security considerations
const extractToken = (req) => {
  // Priority order for token extraction (most secure first)
  const tokenSources = [
    // 1. Authorization header (Bearer) - Most secure
    () => {
      const authHeader = req.headers.authorization;
      if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        return isValidJWTFormat(token) ? { token, source: 'bearer' } : null;
      }
      return null;
    },
    
    // 2. HttpOnly cookies (secure for web apps)
    () => {
      if (!req.cookies) return null;
      
      // Check common secure cookie names
      const secureCookieNames = ['authToken', 'auth-token', 'access_token'];
      for (const name of secureCookieNames) {
        const token = req.cookies[name];
        if (isValidJWTFormat(token)) {
          return { token, source: `cookie:${name}` };
        }
      }
      return null;
    },
    
    // 3. Custom headers (less preferred)
    () => {
      const headerNames = ['x-access-token', 'x-auth-token'];
      for (const name of headerNames) {
        const token = req.headers[name];
        if (isValidJWTFormat(token)) {
          return { token, source: `header:${name}` };
        }
      }
      return null;
    }
  ];
  
  // Try each source until we find a valid token
  for (const getToken of tokenSources) {
    const result = getToken();
    if (result) return result;
  }
  
  return null;
};

// Extract employee ID with validation
const extractEmployeeId = (decoded) => {
  // Common JWT claim names for user identification
  const possibleFields = ['empid', 'employeeId', 'userId', 'sub', 'id'];
  
  for (const field of possibleFields) {
    const value = decoded[field];
    if (value != null) {
      // Validate the ID format (basic security)
      const stringId = String(value);
      if (stringId.length > 0 && stringId.length <= 50) { // Reasonable length limit
        return stringId;
      }
    }
  }
  
  return null;
};

// Cache for blacklisted tokens (in production, use Redis)
const tokenBlacklist = new Set();

// Add token to blacklist
const blacklistToken = (token) => {
  tokenBlacklist.add(token);
  
  // Clean up old tokens periodically (basic implementation)
  if (tokenBlacklist.size > 10000) {
    tokenBlacklist.clear();
  }
};

// Main authentication middleware
const authenticateEmployee = async (req, res, next) => {
  try {
    // Extract token
    const tokenInfo = extractToken(req);
    
    if (!tokenInfo) {
      return res.status(401).json({
        success: false,
        message: 'ไม่พบ Token ที่ถูกต้อง กรุณาเข้าสู่ระบบ',
        errorCode: 'NO_VALID_TOKEN'
      });
    }
    
    const { token, source } = tokenInfo;
    
    // Check if token is blacklisted
    if (tokenBlacklist.has(token)) {
      return res.status(401).json({
        success: false,
        message: 'Token ถูกยกเลิกการใช้งาน กรุณาเข้าสู่ระบบใหม่',
        errorCode: 'TOKEN_BLACKLISTED'
      });
    }
    
    // Verify JWT
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (jwtError) {
      // Handle specific JWT errors
      let errorCode, message;
      
      switch (jwtError.name) {
        case 'TokenExpiredError':
          errorCode = 'TOKEN_EXPIRED';
          message = 'Token หมดอายุ กรุณาเข้าสู่ระบบใหม่';
          break;
        case 'JsonWebTokenError':
          errorCode = 'INVALID_TOKEN';
          message = 'Token ไม่ถูกต้อง';
          break;
        case 'NotBeforeError':
          errorCode = 'TOKEN_NOT_ACTIVE';
          message = 'Token ยังไม่สามารถใช้งานได้';
          break;
        default:
          errorCode = 'TOKEN_ERROR';
          message = 'มีปัญหาเกี่ยวกับ Token';
      }
      
      return res.status(401).json({
        success: false,
        message,
        errorCode
      });
    }
    
    // Extract and validate employee ID
    const employeeId = extractEmployeeId(decoded);
    if (!employeeId) {
      return res.status(401).json({
        success: false,
        message: 'Token ไม่มีข้อมูลรหัสพนักงาน',
        errorCode: 'INVALID_TOKEN_STRUCTURE'
      });
    }
    
    // Fetch employee from database
    const employee = await prisma.empuser.findFirst ({
      where: { empid: employeeId },
      select: {
        id: true,
        empid: true,
        name_emp: true,
        firstname_emp: true,
        lastname_emp: true,
        role: true,
        // Add only necessary fields
      }
    });
    
    if (!employee) {
      return res.status(401).json({
        success: false,
        message: 'ไม่พบพนักงาน หรือบัญชีถูกระงับ',
        errorCode: 'EMPLOYEE_NOT_FOUND'
      });
    }
    
    // Optional: Check if token issued time is after last password change
    // This prevents using old tokens after password reset
    if (decoded.iat && employee.lastPasswordChange) {
      const tokenIssuedAt = new Date(decoded.iat * 1000);
      if (tokenIssuedAt < employee.lastPasswordChange) {
        return res.status(401).json({
          success: false,
          message: 'Token ไม่ถูกต้อง กรุณาเข้าสู่ระบบใหม่',
          errorCode: 'TOKEN_INVALIDATED'
        });
      }
    }
    
    // Set user context
    req.employee = employee;
    req.authToken = token;
    req.tokenSource = source;
    
    // Optional: Update last activity (don't await to avoid blocking)
    prisma.empuser.update({
      where: { id: employee.id },
      data: { lastActivity: new Date() }
    }).catch(() => {}); // Ignore errors for this non-critical update
    
    next();
    
  } catch (error) {
    console.error('Authentication error:', error);
    
    return res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการตรวจสอบสิทธิ์',
      errorCode: 'AUTH_ERROR',
      ...(process.env.NODE_ENV === 'development' && { debug: error.message })
    });
  }
};

// Logout middleware to blacklist token
const logoutEmployee = (req, res, next) => {
  if (req.authToken) {
    blacklistToken(req.authToken);
  }
  next();
};

// Middleware to check specific roles
const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.employee) {
      return res.status(401).json({
        success: false,
        message: 'ไม่ได้รับการยืนยันตัวตน',
        errorCode: 'NOT_AUTHENTICATED'
      });
    }
    
    const userRole = req.employee.role;
    const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
    
    if (!roles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: 'ไม่มีสิทธิ์ในการเข้าถึง',
        errorCode: 'INSUFFICIENT_PRIVILEGES'
      });
    }
    
    next();
  };
};

module.exports = {
  authenticateEmployee,
  logoutEmployee,
  requireRole,
  authRateLimit,
  blacklistToken
};