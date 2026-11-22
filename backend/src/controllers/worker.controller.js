const bcrypt = require('bcryptjs');
const prisma = require('../config/prisma');

/**
 * GET /api/admin/workers
 * İşçilərin siyahısı və canlı maliyyə balansı
 */
const getWorkers = async (req, res) => {
  try {
    const { role, is_active } = req.query;

    const whereClause = {
      role: { in: ['USTA', 'FEHLE'] }, // Müdir xaric işçilər
    };

    if (role && ['USTA', 'FEHLE'].includes(role.toUpperCase())) {
      whereClause.role = role.toUpperCase();
    }

    if (is_active !== undefined) {
      whereClause.is_active = is_active === 'true';
    }

    const workers = await prisma.worker.findMany({
      where: whereClause,
      orderBy: { created_at: 'asc' },
    });

    const result = await Promise.all(
      workers.map(async (worker) => {
        // Son maaş bağlanışını tapırıq
        const lastSettlement = await prisma.salarySettlement.findFirst({
          where: { worker_id: worker.id },
          orderBy: { period_end: 'desc' },
        });

        const periodStartDate = lastSettlement
          ? lastSettlement.period_end
          : new Date(new Date().getFullYear(), new Date().getMonth(), 1);

        // Son bağlanışdan sonrakı qapalı (təsdiqlənmiş) iş günləri
        const closedLogs = await prisma.dailyLog.findMany({
          where: {
            status: 'CLOSED',
            work_date: {
              gt: lastSettlement ? lastSettlement.period_end : new Date('2020-01-01'),
            },
            OR: [
              { usta_id: worker.id },
              { helper_ids: { has: worker.id } },
            ],
          },
          select: { work_date: true },
          orderBy: { work_date: 'desc' },
        });

        // Unikal işlənən günlər
        const uniqueDates = new Set(
          closedLogs.map((l) => l.work_date.toISOString().slice(0, 10))
        );
        const worked_days = uniqueDates.size;
        const last_worked_date = closedLogs.length > 0
          ? closedLogs[0].work_date.toISOString().slice(0, 10)
          : null;

        const gross_salary = Number(worker.daily_wage) * worked_days;

        // Son bağlanışdan sonra götürülən avanslar
        const advances = await prisma.advance.findMany({
          where: {
            worker_id: worker.id,
            given_date: {
              gt: lastSettlement ? lastSettlement.period_end : new Date('2020-01-01'),
            },
          },
          select: { amount: true },
        });

        const total_advances = advances.reduce((sum, a) => sum + Number(a.amount), 0);
        const net_balance = gross_salary - total_advances;

        const periodStartStr = periodStartDate instanceof Date
          ? periodStartDate.toISOString().slice(0, 10)
          : String(periodStartDate).slice(0, 10);

        return {
          id: worker.id,
          full_name: worker.full_name,
          role: worker.role,
          phone: worker.phone,
          daily_wage: Number(worker.daily_wage),
          is_active: worker.is_active,
          current_period: {
            period_start: periodStartStr,
            worked_days,
            gross_salary,
            total_advances,
            net_balance,
            last_worked_date,
          },
        };
      })
    );

    return res.status(200).json({
      success: true,
      message: 'İşçi siyahısı və cari balanslar uğurla gətirildi.',
      data: result,
    });
  } catch (error) {
    console.error('getWorkers xətası:', error);
    return res.status(500).json({
      success: false,
      message: 'Daxili server xətası baş verdi.',
      error_code: 'INTERNAL_SERVER_ERROR',
      details: null,
    });
  }
};

/**
 * POST /api/admin/workers
 * Yeni işçi (Usta və ya Fəhlə) əlavə etmək
 */
const createWorker = async (req, res) => {
  try {
    const { full_name, role, phone, daily_wage, pin } = req.body;

    if (!full_name || !role || !phone || daily_wage === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Bütün məcburi sahələr doldurulmalıdır.',
        error_code: 'VALIDATION_ERROR',
        details: {
          full_name: !full_name ? 'Ad və soyad daxil edilməlidir.' : null,
          role: !role ? 'Rol daxil edilməlidir (USTA və ya FEHLE).' : null,
          phone: !phone ? 'Telefon nömrəsi daxil edilməlidir.' : null,
          daily_wage: daily_wage === undefined ? 'Günlük əmək haqqı daxil edilməlidir.' : null,
        },
      });
    }

    if (!['USTA', 'FEHLE'].includes(role.toUpperCase())) {
      return res.status(400).json({
        success: false,
        message: 'Rol yalnız USTA və ya FEHLE ola bilər.',
        error_code: 'INVALID_ROLE',
        details: null,
      });
    }

    const cleanedPhone = phone.trim();

    // Usta üçün 4 rəqəmli PIN yoxlanışı
    let pin_hash = null;
    if (role.toUpperCase() === 'USTA') {
      if (!pin || !/^\d{4}$/.test(String(pin))) {
        return res.status(400).json({
          success: false,
          message: 'Usta üçün 4 rəqəmli PIN kod mütləq daxil edilməlidir.',
          error_code: 'PIN_REQUIRED',
          details: {
            pin: 'PIN kod dəqiq 4 rəqəmdən ibarət olmalıdır.',
          },
        });
      }
      pin_hash = await bcrypt.hash(String(pin), 10);
    } else if (pin && /^\d{4}$/.test(String(pin))) {
      pin_hash = await bcrypt.hash(String(pin), 10);
    }

    // Telefon nömrəsi unikallığı
    const existing = await prisma.worker.findUnique({
      where: { phone: cleanedPhone },
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'Bu telefon nömrəsi ilə artıq qeydiyyatdan keçmiş işçi mövcuddur.',
        error_code: 'PHONE_ALREADY_EXISTS',
        details: null,
      });
    }

    const worker = await prisma.worker.create({
      data: {
        full_name: full_name.trim(),
        role: role.toUpperCase(),
        phone: cleanedPhone,
        daily_wage: parseFloat(daily_wage),
        pin_hash,
        is_active: true,
      },
    });

    return res.status(201).json({
      success: true,
      message: 'Yeni işçi uğurla qeydiyyata alındı.',
      data: {
        id: worker.id,
        full_name: worker.full_name,
        role: worker.role,
        phone: worker.phone,
        daily_wage: Number(worker.daily_wage),
        is_active: worker.is_active,
        created_at: worker.created_at,
      },
    });
  } catch (error) {
    console.error('createWorker xətası:', error);
    return res.status(500).json({
      success: false,
      message: 'Daxili server xətası baş verdi.',
      error_code: 'INTERNAL_SERVER_ERROR',
      details: null,
    });
  }
};

/**
 * PUT /api/admin/workers/:id
 * İşçi məlumatlarını redaktə etmək
 */
const updateWorker = async (req, res) => {
  try {
    const { id } = req.params;
    const { full_name, phone, daily_wage, pin } = req.body;

    const worker = await prisma.worker.findUnique({
      where: { id },
    });

    if (!worker) {
      return res.status(404).json({
        success: false,
        message: 'Yenilənmək istənən işçi tapılmadı.',
        error_code: 'WORKER_NOT_FOUND',
        details: null,
      });
    }

    const updateData = {};

    if (full_name) updateData.full_name = full_name.trim();
    if (phone) {
      const cleanedPhone = phone.trim();
      if (cleanedPhone !== worker.phone) {
        const phoneExists = await prisma.worker.findUnique({
          where: { phone: cleanedPhone },
        });
        if (phoneExists) {
          return res.status(409).json({
            success: false,
            message: 'Bu telefon nömrəsi artıq başqa işçi tərəfindən istifadə olunur.',
            error_code: 'PHONE_ALREADY_EXISTS',
            details: null,
          });
        }
        updateData.phone = cleanedPhone;
      }
    }

    if (daily_wage !== undefined) {
      updateData.daily_wage = parseFloat(daily_wage);
    }

    if (pin) {
      if (!/^\d{4}$/.test(String(pin))) {
        return res.status(400).json({
          success: false,
          message: 'PIN kod dəqiq 4 rəqəmdən ibarət olmalıdır.',
          error_code: 'INVALID_PIN',
          details: null,
        });
      }
      updateData.pin_hash = await bcrypt.hash(String(pin), 10);
    }

    const updated = await prisma.worker.update({
      where: { id },
      data: updateData,
    });

    return res.status(200).json({
      success: true,
      message: 'İşçi məlumatları uğurla yeniləndi.',
      data: {
        id: updated.id,
        full_name: updated.full_name,
        role: updated.role,
        phone: updated.phone,
        daily_wage: Number(updated.daily_wage),
        is_active: updated.is_active,
        updated_at: updated.updated_at,
      },
    });
  } catch (error) {
    console.error('updateWorker xətası:', error);
    return res.status(500).json({
      success: false,
      message: 'Daxili server xətası baş verdi.',
      error_code: 'INTERNAL_SERVER_ERROR',
      details: null,
    });
  }
};

/**
 * PATCH /api/admin/workers/:id/toggle-active
 * İşçini aktiv/deaktiv etmək
 */
const toggleActive = async (req, res) => {
  try {
    const { id } = req.params;

    const worker = await prisma.worker.findUnique({
      where: { id },
    });

    if (!worker) {
      return res.status(404).json({
        success: false,
        message: 'İşçi tapılmadı.',
        error_code: 'WORKER_NOT_FOUND',
        details: null,
      });
    }

    const updated = await prisma.worker.update({
      where: { id },
      data: {
        is_active: !worker.is_active,
      },
    });

    return res.status(200).json({
      success: true,
      message: 'İşçinin statusu uğurla dəyişdirildi.',
      data: {
        id: updated.id,
        full_name: updated.full_name,
        is_active: updated.is_active,
        updated_at: updated.updated_at,
      },
    });
  } catch (error) {
    console.error('toggleActive xətası:', error);
    return res.status(500).json({
      success: false,
      message: 'Daxili server xətası baş verdi.',
      error_code: 'INTERNAL_SERVER_ERROR',
      details: null,
    });
  }
};

module.exports = {
  getWorkers,
  createWorker,
  updateWorker,
  toggleActive,
};
