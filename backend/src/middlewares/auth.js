const jwt = require('jsonwebtoken');
const prisma = require('../config/prisma');

/**
 * JWT Bearer token yoxlama middleware-i
 */
const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Token təqdim edilməyib və ya format yanlışdır.',
        error_code: 'TOKEN_MISSING',
        details: null,
      });
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Token tapılmadı.',
        error_code: 'TOKEN_MISSING',
        details: null,
      });
    }

    const secret = process.env.JWT_SECRET || 'oxsar_insaat_super_secret_key_2026';
    let decoded;

    try {
      decoded = jwt.verify(token, secret);
    } catch (err) {
      return res.status(401).json({
        success: false,
        message: 'Sessiya müddəti bitib və ya token etibarsızdır. Zəhmət olmasa yenidən daxil olun.',
        error_code: 'TOKEN_EXPIRED',
        details: null,
      });
    }

    const worker = await prisma.worker.findUnique({
      where: { id: decoded.worker_id },
    });

    if (!worker) {
      return res.status(401).json({
        success: false,
        message: 'Bu tokenə uyğun istifadəçi tapılmadı.',
        error_code: 'USER_NOT_FOUND',
        details: null,
      });
    }

    if (!worker.is_active) {
      return res.status(403).json({
        success: false,
        message: 'Bu hesab deaktiv edilib. İdarəçi ilə əlaqə saxlayın.',
        error_code: 'ACCOUNT_DEACTIVATED',
        details: null,
      });
    }

    req.user = worker;
    next();
  } catch (error) {
    console.error('Auth middleware xətası:', error);
    return res.status(500).json({
      success: false,
      message: 'Daxili server xətası.',
      error_code: 'INTERNAL_SERVER_ERROR',
      details: null,
    });
  }
};

/**
 * Yalnız ADMIN rolu üçün icazə yoxlama middleware-i
 */
const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'ADMIN') {
    return res.status(403).json({
      success: false,
      message: 'Bu hesabla Müdür Panelinə daxil olmaq hüququnuz yoxdur.',
      error_code: 'ACCESS_DENIED',
      details: null,
    });
  }
  next();
};

module.exports = {
  verifyToken,
  requireAdmin,
};
