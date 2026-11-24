const crypto = require('crypto');
const prisma = require('../config/prisma');
const { formatDateOnly } = require('../utils/date');

const VALID_PROJECT_STATUSES = ['GOZLEMEDE', 'AKTIV', 'DAYANDIRILIB', 'TAMAMLANDI', 'PASSIV'];
const VALID_SUPPLY_TYPES = ['MATERIALLI', 'ISCILIK'];

function buildMagicLinkUrl(magicToken) {
  const base = (process.env.CLIENT_PORTAL_URL || 'https://oxsarinsaat.az/p').replace(/\/+$/, '');
  return `${base}/${magicToken}`;
}

function computeLaborCost(dailyLogs, wageMap) {
  return Number(
    dailyLogs
      .filter((log) => log.status === 'CLOSED')
      .reduce((sum, log) => {
        const ustaWage = log.usta ? Number(log.usta.daily_wage) : (wageMap.get(log.usta_id) || 0);
        const helpersWage = Array.isArray(log.helper_ids)
          ? log.helper_ids.reduce((hSum, hId) => hSum + (wageMap.get(hId) || 0), 0)
          : 0;
        return sum + ustaWage + helpersWage;
      }, 0)
      .toFixed(2)
  );
}

/**
 * GET /api/admin/projects
 * Bütün layihələrin siyahısı (filtr, axtarış, tamamlanma %, xərc və mənfəət ilə)
 */
const getProjects = async (req, res) => {
  try {
    const { status, search } = req.query;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const whereClause = {};

    if (status && VALID_PROJECT_STATUSES.includes(String(status).toUpperCase())) {
      whereClause.status = String(status).toUpperCase();
    }

    if (search && String(search).trim()) {
      const q = String(search).trim();
      whereClause.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { address: { contains: q, mode: 'insensitive' } },
        { client_name: { contains: q, mode: 'insensitive' } },
        { client_phone: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [totalItems, projects, allWorkers] = await Promise.all([
      prisma.project.count({ where: whereClause }),
      prisma.project.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
        include: {
          stages: true,
          materials: true,
          daily_logs: {
            include: {
              usta: { select: { id: true, daily_wage: true } },
            },
          },
        },
      }),
      prisma.worker.findMany({
        select: { id: true, daily_wage: true },
      }),
    ]);

    const wageMap = new Map(allWorkers.map((w) => [w.id, Number(w.daily_wage)]));

    const formattedProjects = projects.map((project) => {
      const totalTargetM2 = Number(
        project.stages.reduce((sum, s) => sum + Number(s.target_m2), 0).toFixed(2)
      );
      const totalCompletedM2 = Number(
        project.stages.reduce((sum, s) => sum + Number(s.completed_m2), 0).toFixed(2)
      );
      const progressPercent =
        totalTargetM2 > 0
          ? Number(((totalCompletedM2 / totalTargetM2) * 100).toFixed(1))
          : 0;

      const totalAmount = Number(project.total_amount);
      const totalMaterialCost = Number(
        project.materials.reduce((sum, m) => sum + Number(m.total_cost), 0).toFixed(2)
      );
      const totalLaborCost = computeLaborCost(project.daily_logs, wageMap);
      const totalCost = Number((totalMaterialCost + totalLaborCost).toFixed(2));
      const estimatedProfit = Number((totalAmount - totalCost).toFixed(2));
      const profitMarginPercent =
        totalAmount > 0 ? Number(((estimatedProfit / totalAmount) * 100).toFixed(2)) : 0;

      const uniqueWorkerIds = new Set();
      for (const log of project.daily_logs) {
        if (log.usta_id) uniqueWorkerIds.add(log.usta_id);
        if (Array.isArray(log.helper_ids)) {
          log.helper_ids.forEach((hId) => uniqueWorkerIds.add(hId));
        }
      }

      return {
        id: project.id,
        name: project.name,
        address: project.address,
        client_name: project.client_name,
        client_phone: project.client_phone,
        magic_token: project.magic_token,
        status: project.status,
        pause_reason: project.pause_reason,
        supply_type: project.supply_type,
        material_brand: project.material_brand,
        price_per_m2: Number(project.price_per_m2),
        total_target_m2: totalTargetM2,
        total_completed_m2: totalCompletedM2,
        progress_percent: progressPercent,
        overall_progress_percent: progressPercent,
        total_amount: totalAmount,
        total_material_cost: totalMaterialCost,
        estimated_profit: estimatedProfit,
        financial_summary: {
          total_revenue: totalAmount,
          total_material_cost: totalMaterialCost,
          total_labor_cost: totalLaborCost,
          total_cost: totalCost,
          estimated_profit: estimatedProfit,
          profit_margin_percent: profitMarginPercent,
        },
        warranty_years: project.warranty_years,
        stages_count: project.stages.length,
        active_workers_count: uniqueWorkerIds.size,
        completed_at: project.completed_at,
        created_at: project.created_at,
      };
    });

    const totalPages = Math.max(1, Math.ceil(totalItems / limit));

    return res.status(200).json({
      success: true,
      message: 'Layihələrin siyahısı təqdim edildi.',
      data: {
        projects: formattedProjects,
        pagination: {
          total_items: totalItems,
          total_pages: totalPages,
          current_page: page,
          limit,
        },
      },
    });
  } catch (error) {
    console.error('getProjects xətası:', error);
    return res.status(500).json({
      success: false,
      message: 'Daxili server xətası baş verdi.',
      error_code: 'INTERNAL_SERVER_ERROR',
      details: null,
    });
  }
};

/**
 * GET /api/admin/projects/:id
 * Tək layihənin tam detallı kartı
 */
const getProjectById = async (req, res) => {
  try {
    const { id } = req.params;

    const [project, allWorkers] = await Promise.all([
      prisma.project.findUnique({
        where: { id },
        include: {
          stages: {
            include: { work_type: true },
            orderBy: { created_at: 'asc' },
          },
          materials: {
            orderBy: { added_at: 'desc' },
          },
          daily_logs: {
            include: {
              usta: { select: { id: true, full_name: true, phone: true, daily_wage: true } },
              stage: { select: { id: true, stage_name: true } },
            },
            orderBy: [{ work_date: 'desc' }, { created_at: 'desc' }],
          },
        },
      }),
      prisma.worker.findMany({
        select: { id: true, full_name: true, phone: true, daily_wage: true },
      }),
    ]);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Axtarılan layihə tapılmadı.',
        error_code: 'PROJECT_NOT_FOUND',
        details: null,
      });
    }

    const workerMap = new Map(allWorkers.map((w) => [w.id, w]));
    const wageMap = new Map(allWorkers.map((w) => [w.id, Number(w.daily_wage)]));

    const totalTargetM2 = Number(
      project.stages.reduce((sum, s) => sum + Number(s.target_m2), 0).toFixed(2)
    );
    const totalCompletedM2 = Number(
      project.stages.reduce((sum, s) => sum + Number(s.completed_m2), 0).toFixed(2)
    );
    const progressPercent =
      totalTargetM2 > 0
        ? Number(((totalCompletedM2 / totalTargetM2) * 100).toFixed(1))
        : 0;

    const estimatedDaysTotal = Number(
      project.stages
        .reduce((sum, s) => {
          const norm = s.work_type ? Number(s.work_type.daily_norm_m2) : 0;
          return norm > 0 ? sum + Number(s.target_m2) / norm : sum;
        }, 0)
        .toFixed(1)
    );

    const workedDates = new Set(
      project.daily_logs
        .filter((l) => l.status === 'CLOSED')
        .map((l) => formatDateOnly(l.work_date))
        .filter(Boolean)
    );

    const agreedAmount = Number(project.total_amount);
    const materialsCost = Number(
      project.materials.reduce((sum, m) => sum + Number(m.total_cost), 0).toFixed(2)
    );
    const laborCost = computeLaborCost(project.daily_logs, wageMap);
    const netProfit = Number((agreedAmount - (materialsCost + laborCost)).toFixed(2));
    const profitMarginPercent =
      agreedAmount > 0 ? Number(((netProfit / agreedAmount) * 100).toFixed(2)) : 0;

    const formattedStages = project.stages.map((s) => {
      const target = Number(s.target_m2);
      const completed = Number(s.completed_m2);
      const stagePercent = target > 0 ? Number(((completed / target) * 100).toFixed(1)) : 0;
      return {
        id: s.id,
        work_type_id: s.work_type_id,
        work_type_name: s.work_type ? s.work_type.name : '',
        stage_name: s.stage_name,
        target_m2: target,
        completed_m2: completed,
        progress_percent: stagePercent,
        is_completed: target > 0 && completed >= target,
      };
    });

    const formattedMaterials = project.materials.map((m) => ({
      id: m.id,
      project_id: m.project_id,
      item_name: m.item_name,
      quantity: Number(m.quantity),
      unit_cost: Number(m.unit_cost),
      total_cost: Number(m.total_cost),
      added_at: m.added_at,
    }));

    const formattedDailyLogs = project.daily_logs.map((log) => {
      const helpers = Array.isArray(log.helper_ids)
        ? log.helper_ids
            .map((hId) => workerMap.get(hId))
            .filter(Boolean)
            .map((h) => ({
              id: h.id,
              full_name: h.full_name,
              phone: h.phone,
            }))
        : [];

      return {
        id: log.id,
        work_date: formatDateOnly(log.work_date),
        stage_id: log.stage_id || '',
        stage_name: log.stage ? log.stage.stage_name : '',
        usta: log.usta
          ? {
              id: log.usta.id,
              full_name: log.usta.full_name,
              phone: log.usta.phone,
            }
          : {
              id: log.usta_id,
              full_name: 'Naməlum usta',
              phone: '',
            },
        helpers,
        morning_time: log.morning_time || '',
        morning_media_url: log.morning_media_url || '',
        evening_time: log.evening_time || null,
        evening_media_url: log.evening_media_url || null,
        done_m2: Number(log.done_m2),
        material_note: log.material_note,
        is_below_norm: log.is_below_norm,
        status: log.status,
      };
    });

    return res.status(200).json({
      success: true,
      message: 'Layihə detalları uğurla əldə olundu.',
      data: {
        id: project.id,
        name: project.name,
        address: project.address,
        client_name: project.client_name,
        client_phone: project.client_phone,
        magic_token: project.magic_token,
        magic_link_url: buildMagicLinkUrl(project.magic_token),
        status: project.status,
        pause_reason: project.pause_reason,
        supply_type: project.supply_type,
        material_brand: project.material_brand,
        price_per_m2: Number(project.price_per_m2),
        total_amount: agreedAmount,
        warranty_years: project.warranty_years,
        otp_code: project.otp_code || '',
        completed_at: project.completed_at,
        created_at: project.created_at,
        progress: {
          total_target_m2: totalTargetM2,
          total_completed_m2: totalCompletedM2,
          percentage: progressPercent,
          estimated_days_total: estimatedDaysTotal,
          worked_days_so_far: workedDates.size,
        },
        financials: {
          agreed_amount: agreedAmount,
          materials_cost: materialsCost,
          labor_cost: laborCost,
          net_profit: netProfit,
          profit_margin_percent: profitMarginPercent,
        },
        stages: formattedStages,
        materials: formattedMaterials,
        daily_logs: formattedDailyLogs,
      },
    });
  } catch (error) {
    console.error('getProjectById xətası:', error);
    return res.status(500).json({
      success: false,
      message: 'Daxili server xətası baş verdi.',
      error_code: 'INTERNAL_SERVER_ERROR',
      details: null,
    });
  }
};

/**
 * POST /api/admin/projects
 * Yeni təklif / layihə yaratmaq
 */
const createProject = async (req, res) => {
  try {
    const {
      name,
      address,
      client_name,
      client_phone,
      supply_type,
      material_brand,
      price_per_m2,
      warranty_years,
      stages,
    } = req.body;

    const priceNum = Number(price_per_m2);
    const warrantyNum = Number(warranty_years);
    const details = {};

    if (!name || !String(name).trim()) details.name = 'Obyektin adı daxil edilməlidir.';
    if (!address || !String(address).trim()) details.address = 'Ünvan daxil edilməlidir.';
    if (!client_name || !String(client_name).trim()) details.client_name = 'Müştəri adı daxil edilməlidir.';
    if (!client_phone || !String(client_phone).trim()) details.client_phone = 'Müştəri telefonu daxil edilməlidir.';
    if (!supply_type || !VALID_SUPPLY_TYPES.includes(String(supply_type).toUpperCase())) {
      details.supply_type = 'Təchizat növü MATERIALLI və ya ISCILIK olmalıdır.';
    }
    if (Number.isNaN(priceNum) || priceNum <= 0) {
      details.price_per_m2 = '1 m² qiyməti müsbət ədəd olmalıdır.';
    }
    if (Number.isNaN(warrantyNum) || warrantyNum < 0) {
      details.warranty_years = 'Zəmanət müddəti düzgün daxil edilməlidir.';
    }
    if (!Array.isArray(stages) || stages.length === 0) {
      details.stages = 'Ən azı 1 mərhələ təyin olunmalıdır.';
    } else {
      const hasInvalidStage = stages.some(
        (s) => !s.work_type_id || !s.stage_name || !String(s.stage_name).trim() || Number(s.target_m2) <= 0
      );
      if (hasInvalidStage) {
        details.stages = 'Hər mərhələdə iş növü, ad və müsbət m² həcmi doldurulmalıdır.';
      }
    }

    if (Object.keys(details).length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Layihə məlumatları natamamdır.',
        error_code: 'VALIDATION_FAILED',
        details,
      });
    }

    const workTypeIds = [...new Set(stages.map((s) => s.work_type_id))];
    const workTypes = await prisma.workType.findMany({
      where: { id: { in: workTypeIds } },
    });

    const wtMap = new Map(workTypes.map((wt) => [wt.id, wt]));
    for (const wtId of workTypeIds) {
      if (!wtMap.has(wtId)) {
        return res.status(400).json({
          success: false,
          message: `Seçilmiş iş növü tapılmadı: ${wtId}`,
          error_code: 'INVALID_WORK_TYPE',
          details: null,
        });
      }
    }

    const calculatedTotalM2 = Number(
      stages.reduce((sum, s) => sum + Number(s.target_m2), 0).toFixed(2)
    );
    const totalAmount = Number((calculatedTotalM2 * priceNum).toFixed(2));
    const estimatedWorkingDays = Number(
      stages
        .reduce((sum, s) => {
          const wt = wtMap.get(s.work_type_id);
          const norm = Number(wt.daily_norm_m2);
          return norm > 0 ? sum + Number(s.target_m2) / norm : sum;
        }, 0)
        .toFixed(1)
    );

    const magicToken = crypto.randomBytes(6).toString('hex'); // 12 simvollu unikal token
    const otpCode = String(Math.floor(1000 + Math.random() * 9000));
    const normalizedSupplyType = String(supply_type).toUpperCase();

    const createdProject = await prisma.$transaction(async (tx) => {
      const project = await tx.project.create({
        data: {
          name: String(name).trim(),
          address: String(address).trim(),
          client_name: String(client_name).trim(),
          client_phone: String(client_phone).trim(),
          magic_token: magicToken,
          status: 'GOZLEMEDE',
          supply_type: normalizedSupplyType,
          material_brand:
            normalizedSupplyType === 'MATERIALLI' && material_brand
              ? String(material_brand).trim()
              : null,
          price_per_m2: priceNum,
          total_amount: totalAmount,
          warranty_years: Math.round(warrantyNum),
          otp_code: otpCode,
          stages: {
            create: stages.map((s) => ({
              work_type_id: s.work_type_id,
              stage_name: String(s.stage_name).trim(),
              target_m2: Number(s.target_m2),
              completed_m2: 0,
            })),
          },
        },
        include: {
          stages: {
            include: { work_type: true },
            orderBy: { created_at: 'asc' },
          },
        },
      });

      await tx.auditLog.create({
        data: {
          actor_id: req.user.id,
          action: 'CREATE_PROJECT_PROPOSAL',
          target_table: 'projects',
          target_id: project.id,
          details: {
            project_name: project.name,
            total_amount: totalAmount,
            stages_count: project.stages.length,
          },
        },
      });

      return project;
    });

    return res.status(201).json({
      success: true,
      message: 'Yeni layihə və təklif sənədi uğurla yaradıldı.',
      data: {
        id: createdProject.id,
        name: createdProject.name,
        address: createdProject.address,
        client_name: createdProject.client_name,
        client_phone: createdProject.client_phone,
        magic_token: createdProject.magic_token,
        magic_link_url: buildMagicLinkUrl(createdProject.magic_token),
        status: createdProject.status,
        supply_type: createdProject.supply_type,
        material_brand: createdProject.material_brand,
        price_per_m2: Number(createdProject.price_per_m2),
        total_amount: Number(createdProject.total_amount),
        calculated_total_m2: calculatedTotalM2,
        estimated_working_days: estimatedWorkingDays,
        estimated_days: estimatedWorkingDays,
        warranty_years: createdProject.warranty_years,
        otp_code: createdProject.otp_code,
        stages: createdProject.stages.map((s) => ({
          id: s.id,
          work_type_id: s.work_type_id,
          work_type_name: s.work_type ? s.work_type.name : '',
          stage_name: s.stage_name,
          target_m2: Number(s.target_m2),
          completed_m2: Number(s.completed_m2),
        })),
        created_at: createdProject.created_at,
      },
    });
  } catch (error) {
    console.error('createProject xətası:', error);
    return res.status(500).json({
      success: false,
      message: 'Daxili server xətası baş verdi.',
      error_code: 'INTERNAL_SERVER_ERROR',
      details: null,
    });
  }
};

/**
 * PUT /api/admin/projects/:id
 * Layihənin əsas məlumatlarını redaktə etmək
 */
const updateProject = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      address,
      client_name,
      client_phone,
      supply_type,
      material_brand,
      price_per_m2,
      warranty_years,
    } = req.body;

    const existing = await prisma.project.findUnique({
      where: { id },
      include: { stages: true },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Yenilənmək istənən layihə tapılmadı.',
        error_code: 'NOT_FOUND',
        details: null,
      });
    }

    const nextSupplyType = supply_type
      ? String(supply_type).toUpperCase()
      : existing.supply_type;
    if (!VALID_SUPPLY_TYPES.includes(nextSupplyType)) {
      return res.status(400).json({
        success: false,
        message: 'Təchizat növü MATERIALLI və ya ISCILIK olmalıdır.',
        error_code: 'INVALID_SUPPLY_TYPE',
        details: null,
      });
    }

    const nextPricePerM2 =
      price_per_m2 !== undefined ? Number(price_per_m2) : Number(existing.price_per_m2);
    if (Number.isNaN(nextPricePerM2) || nextPricePerM2 <= 0) {
      return res.status(400).json({
        success: false,
        message: '1 m² qiyməti müsbət ədəd olmalıdır.',
        error_code: 'INVALID_PRICE',
        details: null,
      });
    }

    const nextWarrantyYears =
      warranty_years !== undefined ? Math.round(Number(warranty_years)) : existing.warranty_years;
    if (Number.isNaN(nextWarrantyYears) || nextWarrantyYears < 0) {
      return res.status(400).json({
        success: false,
        message: 'Zəmanət müddəti düzgün ədəd olmalıdır.',
        error_code: 'INVALID_WARRANTY',
        details: null,
      });
    }

    const totalTargetM2 = existing.stages.reduce((sum, s) => sum + Number(s.target_m2), 0);
    const recalculatedTotalAmount =
      totalTargetM2 > 0
        ? Number((totalTargetM2 * nextPricePerM2).toFixed(2))
        : Number(existing.total_amount);

    const updated = await prisma.$transaction(async (tx) => {
      const proj = await tx.project.update({
        where: { id },
        data: {
          name: name !== undefined ? String(name).trim() : existing.name,
          address: address !== undefined ? String(address).trim() : existing.address,
          client_name: client_name !== undefined ? String(client_name).trim() : existing.client_name,
          client_phone: client_phone !== undefined ? String(client_phone).trim() : existing.client_phone,
          supply_type: nextSupplyType,
          material_brand:
            nextSupplyType === 'MATERIALLI'
              ? material_brand !== undefined
                ? material_brand
                  ? String(material_brand).trim()
                  : null
                : existing.material_brand
              : null,
          price_per_m2: nextPricePerM2,
          total_amount: recalculatedTotalAmount,
          warranty_years: nextWarrantyYears,
        },
      });

      await tx.auditLog.create({
        data: {
          actor_id: req.user.id,
          action: 'UPDATE_PROJECT',
          target_table: 'projects',
          target_id: proj.id,
          details: {
            project_name: proj.name,
            price_per_m2: Number(proj.price_per_m2),
            total_amount: Number(proj.total_amount),
          },
        },
      });

      return proj;
    });

    return res.status(200).json({
      success: true,
      message: 'Layihə məlumatları uğurla yeniləndi.',
      data: {
        id: updated.id,
        name: updated.name,
        address: updated.address,
        client_name: updated.client_name,
        client_phone: updated.client_phone,
        supply_type: updated.supply_type,
        material_brand: updated.material_brand,
        price_per_m2: Number(updated.price_per_m2),
        total_amount: Number(updated.total_amount),
        warranty_years: updated.warranty_years,
        updated_at: updated.updated_at,
      },
    });
  } catch (error) {
    console.error('updateProject xətası:', error);
    return res.status(500).json({
      success: false,
      message: 'Daxili server xətası baş verdi.',
      error_code: 'INTERNAL_SERVER_ERROR',
      details: null,
    });
  }
};

/**
 * PATCH /api/admin/projects/:id/status
 * Layihə statusunu dəyişmək (DAYANDIRILIB olduqda pause_reason məcburidir)
 */
const changeProjectStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, pause_reason } = req.body;

    const normalizedStatus = status ? String(status).toUpperCase() : '';
    if (!VALID_PROJECT_STATUSES.includes(normalizedStatus)) {
      return res.status(400).json({
        success: false,
        message: 'Layihə statusu düzgün seçilməyib.',
        error_code: 'INVALID_STATUS',
        details: null,
      });
    }

    if (normalizedStatus === 'DAYANDIRILIB' && (!pause_reason || !String(pause_reason).trim())) {
      return res.status(400).json({
        success: false,
        message: 'Layihə müvəqqəti dayandırıldıqda mütləq səbəb qeyd olunmalıdır.',
        error_code: 'PAUSE_REASON_REQUIRED',
        details: {
          pause_reason: 'Bu sahə boş buraxıla bilməz.',
        },
      });
    }

    const existing = await prisma.project.findUnique({
      where: { id },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Statusu dəyişdiriləcək layihə tapılmadı.',
        error_code: 'PROJECT_NOT_FOUND',
        details: null,
      });
    }

    const nextPauseReason =
      normalizedStatus === 'DAYANDIRILIB' ? String(pause_reason).trim() : null;
    const nextCompletedAt =
      normalizedStatus === 'TAMAMLANDI'
        ? new Date()
        : normalizedStatus === 'AKTIV'
        ? null
        : existing.completed_at;

    const updated = await prisma.$transaction(async (tx) => {
      const proj = await tx.project.update({
        where: { id },
        data: {
          status: normalizedStatus,
          pause_reason: nextPauseReason,
          completed_at: nextCompletedAt,
        },
      });

      await tx.auditLog.create({
        data: {
          actor_id: req.user.id,
          action: normalizedStatus === 'DAYANDIRILIB' ? 'PAUSE_PROJECT' : 'CHANGE_PROJECT_STATUS',
          target_table: 'projects',
          target_id: proj.id,
          details: {
            old_status: existing.status,
            status: normalizedStatus,
            pause_reason: nextPauseReason,
          },
        },
      });

      return proj;
    });

    return res.status(200).json({
      success: true,
      message: 'Layihə statusu uğurla dəyişdirildi.',
      data: {
        id: updated.id,
        name: updated.name,
        status: updated.status,
        pause_reason: updated.pause_reason,
        updated_at: updated.updated_at,
      },
    });
  } catch (error) {
    console.error('changeProjectStatus xətası:', error);
    return res.status(500).json({
      success: false,
      message: 'Daxili server xətası baş verdi.',
      error_code: 'INTERNAL_SERVER_ERROR',
      details: null,
    });
  }
};

/**
 * DELETE /api/admin/projects/:id
 * Layihəni silmək və ya əməliyyat tarixçəsi varsa PASSIV statusa arxivləşdirmək
 */
const deleteProject = async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await prisma.project.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            daily_logs: true,
            materials: true,
          },
        },
      },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Silinəcək layihə tapılmadı.',
        error_code: 'PROJECT_NOT_FOUND',
        details: null,
      });
    }

    const hasHistory = existing._count.daily_logs > 0 || existing._count.materials > 0;

    if (hasHistory) {
      await prisma.$transaction(async (tx) => {
        await tx.project.update({
          where: { id },
          data: { status: 'PASSIV' },
        });

        await tx.auditLog.create({
          data: {
            actor_id: req.user.id,
            action: 'ARCHIVE_PROJECT',
            target_table: 'projects',
            target_id: id,
            details: {
              project_name: existing.name,
              reason: 'Layihəyə bağlı iş loqları və ya materiallar mövcuddur.',
            },
          },
        });
      });

      return res.status(200).json({
        success: true,
        message:
          "Layihəyə bağlı iş loqları və ya materiallar olduğu üçün silinmədi, status 'PASSIV' olaraq arxivləşdirildi.",
        data: {
          id,
          deleted: false,
          archived: true,
          status: 'PASSIV',
        },
      });
    }

    await prisma.$transaction(async (tx) => {
      await tx.project.delete({
        where: { id },
      });

      await tx.auditLog.create({
        data: {
          actor_id: req.user.id,
          action: 'DELETE_PROJECT',
          target_table: 'projects',
          target_id: id,
          details: {
            project_name: existing.name,
          },
        },
      });
    });

    return res.status(200).json({
      success: true,
      message: 'Layihə bazadan uğurla silindi.',
      data: {
        id,
        deleted: true,
      },
    });
  } catch (error) {
    console.error('deleteProject xətası:', error);
    return res.status(500).json({
      success: false,
      message: 'Daxili server xətası baş verdi.',
      error_code: 'INTERNAL_SERVER_ERROR',
      details: null,
    });
  }
};

module.exports = {
  getProjects,
  getProjectById,
  createProject,
  updateProject,
  changeProjectStatus,
  deleteProject,
};
