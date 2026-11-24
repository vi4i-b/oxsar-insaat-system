const prisma = require('../config/prisma');
const {
  addDaysToDateStr,
  formatDateOnly,
  getBakuToday,
  parseDateOnlyUTC,
} = require('../utils/date');
const { computeWorkerCurrentPeriod } = require('../utils/payroll.helper');

/**
 * POST /api/admin/advances
 * Sürətli "+ Avans Ver" əməliyyatı
 */
const createAdvance = async (req, res) => {
  try {
    const { worker_id, amount, given_date, note } = req.body;

    if (!worker_id) {
      return res.status(400).json({
        success: false,
        message: 'İşçi seçilməlidir.',
        error_code: 'VALIDATION_ERROR',
        details: { worker_id: 'İşçi ID-si mütləqdir.' },
      });
    }

    const amountNum = Number(amount);
    if (Number.isNaN(amountNum) || amountNum <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Avans məbləği sıfırdan böyük olmalıdır.',
        error_code: 'INVALID_AMOUNT',
        details: null,
      });
    }

    const worker = await prisma.worker.findUnique({
      where: { id: worker_id },
    });

    if (!worker) {
      return res.status(404).json({
        success: false,
        message: 'Avans veriləcək işçi tapılmadı.',
        error_code: 'WORKER_NOT_FOUND',
        details: null,
      });
    }

    const dateStr = given_date ? formatDateOnly(given_date) : getBakuToday();
    const cleanedNote = note && String(note).trim() ? String(note).trim() : null;

    const advance = await prisma.$transaction(async (tx) => {
      const created = await tx.advance.create({
        data: {
          worker_id,
          amount: amountNum,
          given_date: parseDateOnlyUTC(dateStr),
          note: cleanedNote,
          created_by: req.user.id,
        },
      });

      await tx.auditLog.create({
        data: {
          actor_id: req.user.id,
          action: 'CREATE_ADVANCE',
          target_table: 'advances',
          target_id: created.id,
          details: {
            worker_id,
            worker_name: worker.full_name,
            amount: amountNum,
            given_date: dateStr,
            note: cleanedNote,
          },
        },
      });

      return created;
    });

    const [lastSettlement, workerClosedLogs, workerAdvances] = await Promise.all([
      prisma.salarySettlement.findFirst({
        where: { worker_id },
        orderBy: { paid_at: 'desc' },
      }),
      prisma.dailyLog.findMany({
        where: {
          status: 'CLOSED',
          OR: [{ usta_id: worker_id }, { helper_ids: { has: worker_id } }],
        },
        select: {
          usta_id: true,
          helper_ids: true,
          work_date: true,
          created_at: true,
          updated_at: true,
        },
      }),
      prisma.advance.findMany({
        where: { worker_id },
        select: { worker_id: true, amount: true, given_date: true, created_at: true },
      }),
    ]);

    const updatedBalance = computeWorkerCurrentPeriod(
      worker,
      lastSettlement,
      workerClosedLogs,
      workerAdvances
    );

    return res.status(201).json({
      success: true,
      message: `${amountNum.toFixed(2)} AZN avans uğurla qeydə alındı və işçinin balansından çıxıldı.`,
      data: {
        id: advance.id,
        worker_id: advance.worker_id,
        worker_name: worker.full_name,
        amount: Number(advance.amount),
        given_date: formatDateOnly(advance.given_date),
        note: advance.note,
        created_by: advance.created_by,
        updated_worker_balance: {
          total_advances: updatedBalance.total_advances,
          net_balance: updatedBalance.net_balance,
        },
        created_at: advance.created_at,
      },
    });
  } catch (error) {
    console.error('createAdvance xətası:', error);
    return res.status(500).json({
      success: false,
      message: 'Daxili server xətası baş verdi.',
      error_code: 'INTERNAL_SERVER_ERROR',
      details: null,
    });
  }
};

/**
 * GET /api/admin/workers/:id/advances
 * İşçinin avans tarixçəsi
 */
const getWorkerAdvances = async (req, res) => {
  try {
    const { id } = req.params;
    const { from_date, to_date } = req.query;

    const whereClause = { worker_id: id };
    if (from_date || to_date) {
      whereClause.given_date = {};
      if (from_date) whereClause.given_date.gte = parseDateOnlyUTC(from_date);
      if (to_date) whereClause.given_date.lte = parseDateOnlyUTC(to_date);
    }

    const [worker, advances, actors] = await Promise.all([
      prisma.worker.findUnique({
        where: { id },
        select: { id: true, full_name: true, role: true },
      }),
      prisma.advance.findMany({
        where: whereClause,
        orderBy: [{ given_date: 'desc' }, { created_at: 'desc' }],
      }),
      prisma.worker.findMany({
        where: { role: 'ADMIN' },
        select: { id: true, full_name: true },
      }),
    ]);

    if (!worker) {
      return res.status(404).json({
        success: false,
        message: 'İşçi tapılmadı.',
        error_code: 'WORKER_NOT_FOUND',
        details: null,
      });
    }

    const actorMap = new Map(actors.map((a) => [a.id, `${a.full_name} (Müdir)`]));

    const formattedAdvances = advances.map((adv) => ({
      id: adv.id,
      amount: Number(adv.amount),
      given_date: formatDateOnly(adv.given_date),
      note: adv.note,
      created_by_name: adv.created_by ? actorMap.get(adv.created_by) || 'Müdir' : 'Sistem',
      created_at: adv.created_at,
    }));

    const totalAdvancesSum = Number(
      formattedAdvances.reduce((sum, a) => sum + a.amount, 0).toFixed(2)
    );

    return res.status(200).json({
      success: true,
      message: 'İşçinin avans tarixçəsi gətirildi.',
      data: {
        worker,
        total_advances_sum: totalAdvancesSum,
        advances: formattedAdvances,
      },
    });
  } catch (error) {
    console.error('getWorkerAdvances xətası:', error);
    return res.status(500).json({
      success: false,
      message: 'Daxili server xətası baş verdi.',
      error_code: 'INTERNAL_SERVER_ERROR',
      details: null,
    });
  }
};

/**
 * POST /api/admin/workers/:id/settle
 * Maaş ödənişi və dövrün bağlanması ("Ödənildi və Dövrü Bağla")
 */
const settleWorkerPayroll = async (req, res) => {
  try {
    const { id } = req.params;
    const { period_start, period_end, note } = req.body || {};

    const [worker, lastSettlement, workerClosedLogs, workerAdvances] = await Promise.all([
      prisma.worker.findUnique({ where: { id } }),
      prisma.salarySettlement.findFirst({
        where: { worker_id: id },
        orderBy: { paid_at: 'desc' },
      }),
      prisma.dailyLog.findMany({
        where: {
          status: 'CLOSED',
          OR: [{ usta_id: id }, { helper_ids: { has: id } }],
        },
        select: {
          usta_id: true,
          helper_ids: true,
          work_date: true,
          created_at: true,
          updated_at: true,
        },
      }),
      prisma.advance.findMany({
        where: { worker_id: id },
        select: { worker_id: true, amount: true, given_date: true, created_at: true },
      }),
    ]);

    if (!worker) {
      return res.status(404).json({
        success: false,
        message: 'İşçi tapılmadı.',
        error_code: 'WORKER_NOT_FOUND',
        details: null,
      });
    }

    const current = computeWorkerCurrentPeriod(
      worker,
      lastSettlement,
      workerClosedLogs,
      workerAdvances
    );

    if (
      current.worked_days === 0 &&
      current.gross_salary === 0 &&
      current.total_advances === 0
    ) {
      return res.status(400).json({
        success: false,
        message: 'Bu dövr üçün bağlanacaq işlənmiş gün və ya ödəniləcək məbləğ yoxdur.',
        error_code: 'NOTHING_TO_SETTLE',
        details: null,
      });
    }

    const pStart = period_start ? formatDateOnly(period_start) : current.period_start;
    const pEnd = period_end ? formatDateOnly(period_end) : getBakuToday();
    const cleanedNote = note && String(note).trim() ? String(note).trim() : null;

    const settlement = await prisma.$transaction(async (tx) => {
      const created = await tx.salarySettlement.create({
        data: {
          worker_id: id,
          period_start: parseDateOnlyUTC(pStart),
          period_end: parseDateOnlyUTC(pEnd),
          worked_days: current.worked_days,
          gross_salary: current.gross_salary,
          total_advances: current.total_advances,
          net_paid: current.net_balance,
          paid_at: new Date(),
        },
      });

      await tx.auditLog.create({
        data: {
          actor_id: req.user.id,
          action: 'SETTLE_SALARY',
          target_table: 'salary_settlements',
          target_id: created.id,
          details: {
            worker_id: worker.id,
            worker_name: worker.full_name,
            period_start: pStart,
            period_end: pEnd,
            worked_days: current.worked_days,
            gross_salary: current.gross_salary,
            total_advances: current.total_advances,
            net_paid: current.net_balance,
            note: cleanedNote,
          },
        },
      });

      return created;
    });

    return res.status(200).json({
      success: true,
      message:
        'Hesablaşma uğurla bağlandı və arxivə köçürüldü. Yeni dövr sıfır balansla açıldı.',
      data: {
        settlement_id: settlement.id,
        worker_id: worker.id,
        worker_name: worker.full_name,
        period_start: pStart,
        period_end: pEnd,
        worked_days: settlement.worked_days,
        daily_wage: Number(worker.daily_wage),
        gross_salary: Number(settlement.gross_salary),
        total_advances: Number(settlement.total_advances),
        net_paid: Number(settlement.net_paid),
        paid_at: settlement.paid_at,
        new_period_opened_at: addDaysToDateStr(pEnd, 1),
      },
    });
  } catch (error) {
    console.error('settleWorkerPayroll xətası:', error);
    return res.status(500).json({
      success: false,
      message: 'Daxili server xətası baş verdi.',
      error_code: 'INTERNAL_SERVER_ERROR',
      details: null,
    });
  }
};

/**
 * GET /api/admin/salary-settlements
 * Keçmiş maaş ödənişləri arxivi
 */
const getSalarySettlements = async (req, res) => {
  try {
    const { worker_id, month } = req.query;

    const whereClause = {};
    if (worker_id) {
      whereClause.worker_id = worker_id;
    }

    if (month && /^\d{4}-\d{2}$/.test(String(month))) {
      const [yearStr, monthStr] = String(month).split('-');
      const year = Number(yearStr);
      const mon = Number(monthStr);
      const nextMonthStr =
        mon === 12 ? `${year + 1}-01` : `${year}-${String(mon + 1).padStart(2, '0')}`;

      whereClause.paid_at = {
        gte: new Date(`${month}-01T00:00:00+04:00`),
        lt: new Date(`${nextMonthStr}-01T00:00:00+04:00`),
      };
    }

    const settlements = await prisma.salarySettlement.findMany({
      where: whereClause,
      include: {
        worker: {
          select: { id: true, full_name: true, role: true },
        },
      },
      orderBy: { paid_at: 'desc' },
    });

    const formatted = settlements.map((s) => ({
      id: s.id,
      worker_id: s.worker_id,
      worker_name: s.worker ? s.worker.full_name : '',
      worker_role: s.worker ? s.worker.role : 'FEHLE',
      period_start: formatDateOnly(s.period_start),
      period_end: formatDateOnly(s.period_end),
      worked_days: s.worked_days,
      gross_salary: Number(s.gross_salary),
      total_advances: Number(s.total_advances),
      net_paid: Number(s.net_paid),
      paid_at: s.paid_at,
    }));

    return res.status(200).json({
      success: true,
      message: 'Maaş hesablaşmaları arxivi gətirildi.',
      data: formatted,
    });
  } catch (error) {
    console.error('getSalarySettlements xətası:', error);
    return res.status(500).json({
      success: false,
      message: 'Daxili server xətası baş verdi.',
      error_code: 'INTERNAL_SERVER_ERROR',
      details: null,
    });
  }
};

module.exports = {
  createAdvance,
  getWorkerAdvances,
  settleWorkerPayroll,
  getSalarySettlements,
};
