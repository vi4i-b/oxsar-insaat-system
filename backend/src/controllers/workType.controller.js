const prisma = require('../config/prisma');

/**
 * GET /api/admin/work-types
 * Bütün iş növləri və normativlərin siyahısı
 */
const getWorkTypes = async (req, res) => {
  try {
    const workTypes = await prisma.workType.findMany({
      orderBy: { created_at: 'asc' },
    });

    const formatted = workTypes.map((wt) => ({
      id: wt.id,
      name: wt.name,
      daily_norm_m2: Number(wt.daily_norm_m2),
      default_price_m2: Number(wt.default_price_m2),
      created_at: wt.created_at,
    }));

    return res.status(200).json({
      success: true,
      message: 'İş növləri və normativlər kataloqu təqdim edildi.',
      data: formatted,
    });
  } catch (error) {
    console.error('getWorkTypes xətası:', error);
    return res.status(500).json({
      success: false,
      message: 'Daxili server xətası baş verdi.',
      error_code: 'INTERNAL_SERVER_ERROR',
      details: null,
    });
  }
};

/**
 * POST /api/admin/work-types
 * Yeni iş növü əlavə etmək
 */
const createWorkType = async (req, res) => {
  try {
    const { name, daily_norm_m2, default_price_m2 } = req.body;

    if (!name || daily_norm_m2 === undefined || default_price_m2 === undefined) {
      return res.status(400).json({
        success: false,
        message: 'İş növünün adı, günlük norması və standart qiyməti daxil edilməlidir.',
        error_code: 'VALIDATION_ERROR',
        details: {
          name: !name ? 'İş növünün adı boş ola bilməz.' : null,
          daily_norm_m2: daily_norm_m2 === undefined ? 'Günlük norma daxil edilməlidir.' : null,
          default_price_m2: default_price_m2 === undefined ? 'Standart qiymət daxil edilməlidir.' : null,
        },
      });
    }

    const norm = parseFloat(daily_norm_m2);
    const price = parseFloat(default_price_m2);

    if (isNaN(norm) || norm <= 0 || isNaN(price) || price < 0) {
      return res.status(400).json({
        success: false,
        message: 'Normativ və qiymət müsbət rəqəm olmalıdır.',
        error_code: 'INVALID_NUMBER_VALUE',
        details: null,
      });
    }

    const workType = await prisma.workType.create({
      data: {
        name: name.trim(),
        daily_norm_m2: norm,
        default_price_m2: price,
      },
    });

    return res.status(201).json({
      success: true,
      message: 'Yeni iş növü kataloqa əlavə edildi.',
      data: {
        id: workType.id,
        name: workType.name,
        daily_norm_m2: Number(workType.daily_norm_m2),
        default_price_m2: Number(workType.default_price_m2),
        created_at: workType.created_at,
      },
    });
  } catch (error) {
    console.error('createWorkType xətası:', error);
    return res.status(500).json({
      success: false,
      message: 'Daxili server xətası baş verdi.',
      error_code: 'INTERNAL_SERVER_ERROR',
      details: null,
    });
  }
};

/**
 * PUT /api/admin/work-types/:id
 * Mövcud iş növünü redaktə etmək
 */
const updateWorkType = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, daily_norm_m2, default_price_m2 } = req.body;

    const existing = await prisma.workType.findUnique({
      where: { id },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Yenilənmək istənən iş növü tapılmadı.',
        error_code: 'WORK_TYPE_NOT_FOUND',
        details: null,
      });
    }

    const updateData = {};
    if (name) updateData.name = name.trim();
    if (daily_norm_m2 !== undefined) {
      const norm = parseFloat(daily_norm_m2);
      if (isNaN(norm) || norm <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Günlük norma müsbət ədəd olmalıdır.',
          error_code: 'INVALID_NORM',
          details: null,
        });
      }
      updateData.daily_norm_m2 = norm;
    }

    if (default_price_m2 !== undefined) {
      const price = parseFloat(default_price_m2);
      if (isNaN(price) || price < 0) {
        return res.status(400).json({
          success: false,
          message: 'Standart qiymət düzgün rəqəm olmalıdır.',
          error_code: 'INVALID_PRICE',
          details: null,
        });
      }
      updateData.default_price_m2 = price;
    }

    const updated = await prisma.workType.update({
      where: { id },
      data: updateData,
    });

    return res.status(200).json({
      success: true,
      message: 'İş növü normativi uğurla yeniləndi.',
      data: {
        id: updated.id,
        name: updated.name,
        daily_norm_m2: Number(updated.daily_norm_m2),
        default_price_m2: Number(updated.default_price_m2),
        updated_at: updated.updated_at,
      },
    });
  } catch (error) {
    console.error('updateWorkType xətası:', error);
    return res.status(500).json({
      success: false,
      message: 'Daxili server xətası baş verdi.',
      error_code: 'INTERNAL_SERVER_ERROR',
      details: null,
    });
  }
};

module.exports = {
  getWorkTypes,
  createWorkType,
  updateWorkType,
};
