const prisma = require('../config/prisma');

/**
 * GET /api/admin/analytics/summary
 * Ümumi Dashboard statistikası (Executive Summary)
 */
const getSummary = async (req, res) => {
  try {
    const { start_date, end_date } = req.query;

    const dateFilter = {};
    if (start_date || end_date) {
      dateFilter.created_at = {};
      if (start_date) {
        dateFilter.created_at.gte = new Date(`${start_date}T00:00:00+04:00`);
      }
      if (end_date) {
        dateFilter.created_at.lte = new Date(`${end_date}T23:59:59.999+04:00`);
      }
    }

    const [totalActiveWorkers, projects, allWorkers] = await Promise.all([
      prisma.worker.count({
        where: {
          is_active: true,
          role: { in: ['USTA', 'FEHLE'] },
        },
      }),
      prisma.project.findMany({
        where: dateFilter,
        include: {
          stages: true,
          materials: true,
          daily_logs: {
            where: { status: 'CLOSED' },
            include: { usta: true },
          },
        },
        orderBy: { created_at: 'desc' },
      }),
      prisma.worker.findMany({
        select: { id: true, daily_wage: true },
      }),
    ]);

    const wageMap = new Map(
      allWorkers.map((w) => [w.id, Number(w.daily_wage)])
    );

    let activeProjectsCount = 0;
    let pendingProposalsCount = 0;
    let pausedProjectsCount = 0;
    let completedProjectsCount = 0;
    let totalRevenue = 0;
    let totalMaterialCost = 0;
    let totalLaborCost = 0;

    const projectsComparison = projects.map((project) => {
      if (project.status === 'AKTIV') activeProjectsCount += 1;
      else if (project.status === 'GOZLEMEDE') pendingProposalsCount += 1;
      else if (project.status === 'DAYANDIRILIB') pausedProjectsCount += 1;
      else if (project.status === 'TAMAMLANDI') completedProjectsCount += 1;

      const projectTotalAmount = Number(project.total_amount);
      const materialCost = project.materials.reduce(
        (sum, m) => sum + Number(m.total_cost),
        0
      );

      const laborCost = project.daily_logs.reduce((sum, log) => {
        const ustaWage = log.usta ? Number(log.usta.daily_wage) : (wageMap.get(log.usta_id) || 0);
        const helpersWage = Array.isArray(log.helper_ids)
          ? log.helper_ids.reduce((hSum, hId) => hSum + (wageMap.get(hId) || 0), 0)
          : 0;
        return sum + ustaWage + helpersWage;
      }, 0);

      const netProfit = projectTotalAmount - (materialCost + laborCost);
      const profitMarginPercent =
        projectTotalAmount > 0
          ? Number(((netProfit / projectTotalAmount) * 100).toFixed(2))
          : 0;

      const totalTargetM2 = project.stages.reduce(
        (sum, s) => sum + Number(s.target_m2),
        0
      );
      const totalCompletedM2 = project.stages.reduce(
        (sum, s) => sum + Number(s.completed_m2),
        0
      );
      const progressPercent =
        totalTargetM2 > 0
          ? Number(((totalCompletedM2 / totalTargetM2) * 100).toFixed(1))
          : 0;

      if (project.status !== 'PASSIV') {
        totalRevenue += projectTotalAmount;
        totalMaterialCost += materialCost;
        totalLaborCost += laborCost;
      }

      return {
        project_id: project.id,
        name: project.name,
        status: project.status,
        total_amount: projectTotalAmount,
        material_cost: materialCost,
        labor_cost: laborCost,
        net_profit: netProfit,
        profit_margin_percent: profitMarginPercent,
        progress_percent: progressPercent,
      };
    });

    const totalExpenses = totalMaterialCost + totalLaborCost;
    const netProfit = totalRevenue - totalExpenses;
    const averageProfitMarginPercent =
      totalRevenue > 0
        ? Number(((netProfit / totalRevenue) * 100).toFixed(2))
        : 0;

    return res.status(200).json({
      success: true,
      message: 'İdarəetmə və mənfəət statistikası təqdim edildi.',
      data: {
        kpis: {
          active_projects_count: activeProjectsCount,
          pending_proposals_count: pendingProposalsCount,
          paused_projects_count: pausedProjectsCount,
          completed_projects_count: completedProjectsCount,
          total_active_workers: totalActiveWorkers,
          total_revenue: totalRevenue,
          total_material_cost: totalMaterialCost,
          total_labor_cost: totalLaborCost,
          total_expenses: totalExpenses,
          net_profit: netProfit,
          average_profit_margin_percent: averageProfitMarginPercent,
        },
        projects_comparison: projectsComparison,
      },
    });
  } catch (error) {
    console.error('getSummary xətası:', error);
    return res.status(500).json({
      success: false,
      message: 'Daxili server xətası baş verdi.',
      error_code: 'INTERNAL_SERVER_ERROR',
      details: null,
    });
  }
};

/**
 * GET /api/admin/audit-logs
 * Sistemdəki bütün audit qeydləri (yenidən köhnəyə)
 */
const getAuditLogs = async (req, res) => {
  try {
    const { target_table } = req.query;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const skip = (page - 1) * limit;

    const whereClause = {};
    if (target_table && String(target_table).trim()) {
      whereClause.target_table = String(target_table).trim();
    }

    const [totalItems, logs] = await Promise.all([
      prisma.auditLog.count({ where: whereClause }),
      prisma.auditLog.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
        include: {
          actor: {
            select: { id: true, full_name: true, role: true },
          },
        },
      }),
    ]);

    const formattedLogs = logs.map((log) => ({
      id: log.id,
      actor: log.actor
        ? {
            id: log.actor.id,
            full_name: log.actor.full_name,
            role: log.actor.role,
          }
        : {
            id: '',
            full_name: 'Sistem',
            role: 'ADMIN',
          },
      action: log.action,
      target_table: log.target_table,
      target_id: log.target_id || '',
      details: log.details,
      created_at: log.created_at,
    }));

    const totalPages = Math.max(1, Math.ceil(totalItems / limit));

    return res.status(200).json({
      success: true,
      message: 'Audit jurnalı uğurla təqdim edildi.',
      data: {
        logs: formattedLogs,
        pagination: {
          total_items: totalItems,
          current_page: page,
          total_pages: totalPages,
          limit,
        },
      },
    });
  } catch (error) {
    console.error('getAuditLogs xətası:', error);
    return res.status(500).json({
      success: false,
      message: 'Daxili server xətası baş verdi.',
      error_code: 'INTERNAL_SERVER_ERROR',
      details: null,
    });
  }
};

/**
 * PATCH /api/admin/daily-logs/:id
 * Yalnız müdir tərəfindən ustanın gündəlik loguna düzəliş edilməsi
 */
const overrideDailyLog = async (req, res) => {
  try {
    const { id } = req.params;
    const { done_m2, material_note, is_below_norm, admin_correction_reason } = req.body;

    const doneM2Num = Number(done_m2);
    if (done_m2 === undefined || Number.isNaN(doneM2Num) || doneM2Num < 0) {
      return res.status(400).json({
        success: false,
        message: 'Düzəldilmiş m² göstəricisi mənfi olmayan rəqəm olmalıdır.',
        error_code: 'VALIDATION_ERROR',
        details: null,
      });
    }

    const reason = admin_correction_reason ? String(admin_correction_reason).trim() : '';
    if (reason.length < 10) {
      return res.status(400).json({
        success: false,
        message: 'Düzəliş səbəbi (ən azı 10 simvol) mütləq daxil edilməlidir.',
        error_code: 'CORRECTION_REASON_REQUIRED',
        details: null,
      });
    }

    const existingLog = await prisma.dailyLog.findUnique({
      where: { id },
    });

    if (!existingLog) {
      return res.status(404).json({
        success: false,
        message: 'Düzəliş ediləcək gündəlik hesabat tapılmadı.',
        error_code: 'LOG_NOT_FOUND',
        details: null,
      });
    }

    const previousDoneM2 = Number(existingLog.done_m2);

    const txResult = await prisma.$transaction(async (tx) => {
      const updateData = { done_m2: doneM2Num };
      if (material_note !== undefined) {
        updateData.material_note = material_note ? String(material_note).trim() : null;
      }
      if (is_below_norm !== undefined) {
        updateData.is_below_norm = Boolean(is_below_norm);
      }

      const updatedLog = await tx.dailyLog.update({
        where: { id },
        data: updateData,
      });

      let updatedStage = null;
      if (existingLog.stage_id) {
        const stageAgg = await tx.dailyLog.aggregate({
          where: { stage_id: existingLog.stage_id },
          _sum: { done_m2: true },
        });
        const stageCompletedM2 = Number(stageAgg._sum.done_m2 || 0);

        updatedStage = await tx.projectStage.update({
          where: { id: existingLog.stage_id },
          data: { completed_m2: stageCompletedM2 },
        });
      }

      const projectStages = await tx.projectStage.findMany({
        where: { project_id: existingLog.project_id },
      });

      const totalProjectTarget = projectStages.reduce((sum, s) => sum + Number(s.target_m2), 0);
      const totalProjectCompleted = Number(
        projectStages.reduce((sum, s) => sum + Number(s.completed_m2), 0).toFixed(2)
      );
      const projectProgressPercent =
        totalProjectTarget > 0
          ? Number(((totalProjectCompleted / totalProjectTarget) * 100).toFixed(1))
          : 0;

      await tx.auditLog.create({
        data: {
          actor_id: req.user.id,
          action: 'UPDATE_DAILY_LOG_M2',
          target_table: 'daily_logs',
          target_id: existingLog.id,
          details: {
            old_done_m2: previousDoneM2,
            new_done_m2: doneM2Num,
            reason,
          },
        },
      });

      return {
        updatedLog,
        updatedStage,
        totalProjectCompleted,
        projectProgressPercent,
      };
    });

    const stageTarget = txResult.updatedStage ? Number(txResult.updatedStage.target_m2) : 0;
    const stageCompleted = txResult.updatedStage ? Number(txResult.updatedStage.completed_m2) : 0;

    return res.status(200).json({
      success: true,
      message:
        'Gündəlik hesabat uğurla düzəldildi, layihə faizi yeniləndi və audit qeydi yaradıldı.',
      data: {
        id: txResult.updatedLog.id,
        project_id: txResult.updatedLog.project_id,
        stage_id: txResult.updatedLog.stage_id || '',
        previous_done_m2: previousDoneM2,
        new_done_m2: Number(txResult.updatedLog.done_m2),
        admin_correction_reason: reason,
        recalculated_stage: txResult.updatedStage
          ? {
              id: txResult.updatedStage.id,
              completed_m2: stageCompleted,
              target_m2: stageTarget,
              progress_percent:
                stageTarget > 0
                  ? Number(((stageCompleted / stageTarget) * 100).toFixed(1))
                  : 0,
            }
          : {
              id: '',
              completed_m2: 0,
              target_m2: 0,
              progress_percent: 0,
            },
        recalculated_project: {
          total_completed_m2: txResult.totalProjectCompleted,
          progress_percent: txResult.projectProgressPercent,
        },
        updated_at: txResult.updatedLog.updated_at,
      },
    });
  } catch (error) {
    console.error('overrideDailyLog xətası:', error);
    return res.status(500).json({
      success: false,
      message: 'Daxili server xətası baş verdi.',
      error_code: 'INTERNAL_SERVER_ERROR',
      details: null,
    });
  }
};

module.exports = {
  getSummary,
  getAuditLogs,
  overrideDailyLog,
};
