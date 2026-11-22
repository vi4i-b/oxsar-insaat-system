const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../config/prisma');

/**
 * POST /api/admin/login
 * Müdir girişi və JWT token generasiyası
 */
const login = async (req, res) => {
  try {
    const { phone, password } = req.body;

    if (!phone || !password) {
      return res.status(400).json({
        success: false,
        message: 'Telefon nömrəsi və şifrə daxil edilməlidir.',
        error_code: 'VALIDATION_ERROR',
        details: {
          phone: !phone ? 'Telefon nömrəsi daxil edilməlidir.' : null,
          password: !password ? 'Şifrə daxil edilməlidir.' : null,
        },
      });
    }

    // Telefon nömrəsinə görə axtarış (boşluqları təmizləyərək)
    const cleanedPhone = phone.trim();
    const worker = await prisma.worker.findUnique({
      where: { phone: cleanedPhone },
    });

    if (!worker) {
      return res.status(401).json({
        success: false,
        message: 'Telefon nömrəsi və ya şifrə yanlışdır.',
        error_code: 'INVALID_CREDENTIALS',
        details: null,
      });
    }

    // Rol yoxlanışı (Yalnız ADMIN müdir panelinə daxil ola bilər)
    if (worker.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Bu hesabla Müdür Panelinə daxil olmaq hüququnuz yoxdur.',
        error_code: 'ACCESS_DENIED',
        details: null,
      });
    }

    // Hesab aktivliyi
    if (!worker.is_active) {
      return res.status(403).json({
        success: false,
        message: 'Bu hesab deaktiv edilib. Sistem idarəçisi ilə əlaqə saxlayın.',
        error_code: 'ACCOUNT_DEACTIVATED',
        details: null,
      });
    }

    // Şifrə yoxlanışı
    if (!worker.password_hash) {
      return res.status(401).json({
        success: false,
        message: 'Bu hesaba şifrə təyin edilməyib.',
        error_code: 'NO_PASSWORD_SET',
        details: null,
      });
    }

    const isMatch = await bcrypt.compare(password, worker.password_hash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Telefon nömrəsi və ya şifrə yanlışdır.',
        error_code: 'INVALID_CREDENTIALS',
        details: null,
      });
    }

    // JWT Token yaradılması (7 günlük etibarlılıq)
    const secret = process.env.JWT_SECRET || 'oxsar_insaat_super_secret_key_2026';
    const expiresIn = 604800; // 7 gün saniyələrlə

    const token = jwt.sign(
      {
        worker_id: worker.id,
        full_name: worker.full_name,
        role: worker.role,
        phone: worker.phone,
      },
      secret,
      { expiresIn: '7d' }
    );

    return res.status(200).json({
      success: true,
      message: 'Sistemə uğurla daxil oldunuz.',
      data: {
        access_token: token,
        token_type: 'Bearer',
        expires_in: expiresIn,
        admin: {
          id: worker.id,
          full_name: worker.full_name,
          role: worker.role,
          phone: worker.phone,
          is_active: worker.is_active,
        },
      },
    });
  } catch (error) {
    console.error('Login xətası:', error);
    return res.status(500).json({
      success: false,
      message: 'Daxili server xətası baş verdi.',
      error_code: 'INTERNAL_SERVER_ERROR',
      details: null,
    });
  }
};

/**
 * GET /api/admin/me
 * Cari müdir profil məlumatlarını qaytarır
 */
const getMe = async (req, res) => {
  try {
    const worker = req.user;

    return res.status(200).json({
      success: true,
      message: 'Profil məlumatları təqdim edildi.',
      data: {
        id: worker.id,
        full_name: worker.full_name,
        role: worker.role,
        phone: worker.phone,
        is_active: worker.is_active,
        company: {
          name: 'Oxşar İnşaat',
          field: 'Hidroizolyasiya və Dam Örtükləri',
          timezone: 'Asia/Baku',
        },
      },
    });
  } catch (error) {
    console.error('getMe xətası:', error);
    return res.status(500).json({
      success: false,
      message: 'Daxili server xətası baş verdi.',
      error_code: 'INTERNAL_SERVER_ERROR',
      details: null,
    });
  }
};

module.exports = {
  login,
  getMe,
};
