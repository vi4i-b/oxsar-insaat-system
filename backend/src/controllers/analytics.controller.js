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

module.exports = {
  getSummary,
};
