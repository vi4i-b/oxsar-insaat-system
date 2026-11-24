const prisma = require('../config/prisma');

/**
 * GET /api/admin/projects/:projectId/materials
 * Obyektə göndərilən materialların siyahısı və ümumi xərc
 */
const getProjectMaterials = async (req, res) => {
  try {
    const { projectId } = req.params;

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        materials: {
          orderBy: { added_at: 'desc' },
        },
      },
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Axtarılan layihə tapılmadı.',
        error_code: 'PROJECT_NOT_FOUND',
        details: null,
      });
    }

    const materials = project.materials.map((m) => ({
      id: m.id,
      item_name: m.item_name,
      quantity: Number(m.quantity),
      unit_cost: Number(m.unit_cost),
      total_cost: Number(m.total_cost),
      added_at: m.added_at,
    }));

    const totalMaterialCostSum = Number(
      materials.reduce((sum, m) => sum + m.total_cost, 0).toFixed(2)
    );

    return res.status(200).json({
      success: true,
      message: 'Obyektin material xərcləri siyahısı gətirildi.',
      data: {
        project_id: project.id,
        project_name: project.name,
        total_material_cost_sum: totalMaterialCostSum,
        materials,
      },
    });
  } catch (error) {
    console.error('getProjectMaterials xətası:', error);
    return res.status(500).json({
      success: false,
      message: 'Daxili server xətası baş verdi.',
      error_code: 'INTERNAL_SERVER_ERROR',
      details: null,
    });
  }
};

/**
 * POST /api/admin/projects/:projectId/materials
 * Obyektə yeni material xərci əlavə etmək (total_cost avtomatik hesablanır)
 */
const createProjectMaterial = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { item_name, quantity, unit_cost } = req.body;

    const qty = Number(quantity);
    const unit = Number(unit_cost);

    if (!item_name || !String(item_name).trim() || Number.isNaN(qty) || qty <= 0 || Number.isNaN(unit) || unit <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Miqdar və vahid qiymət müsbət ədəd olmalıdır.',
        error_code: 'INVALID_MATERIAL_DATA',
        details: null,
      });
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Material əlavə ediləcək layihə tapılmadı.',
        error_code: 'PROJECT_NOT_FOUND',
        details: null,
      });
    }

    const totalCost = Number((qty * unit).toFixed(2));
    const cleanedName = String(item_name).trim();

    const { created, newTotal } = await prisma.$transaction(async (tx) => {
      const mat = await tx.projectMaterial.create({
        data: {
          project_id: projectId,
          item_name: cleanedName,
          quantity: qty,
          unit_cost: unit,
          total_cost: totalCost,
        },
      });

      const agg = await tx.projectMaterial.aggregate({
        where: { project_id: projectId },
        _sum: { total_cost: true },
      });

      await tx.auditLog.create({
        data: {
          actor_id: req.user.id,
          action: 'ADD_PROJECT_MATERIAL',
          target_table: 'project_materials',
          target_id: mat.id,
          details: {
            project_id: projectId,
            project_name: project.name,
            item_name: cleanedName,
            quantity: qty,
            unit_cost: unit,
            total_cost: totalCost,
          },
        },
      });

      return {
        created: mat,
        newTotal: Number(agg._sum.total_cost || 0),
      };
    });

    return res.status(201).json({
      success: true,
      message: 'Material xərci layihə kartına uğurla əlavə olundu.',
      data: {
        id: created.id,
        project_id: created.project_id,
        item_name: created.item_name,
        quantity: Number(created.quantity),
        unit_cost: Number(created.unit_cost),
        total_cost: Number(created.total_cost),
        added_at: created.added_at,
        new_project_material_total: newTotal,
      },
    });
  } catch (error) {
    console.error('createProjectMaterial xətası:', error);
    return res.status(500).json({
      success: false,
      message: 'Daxili server xətası baş verdi.',
      error_code: 'INTERNAL_SERVER_ERROR',
      details: null,
    });
  }
};

/**
 * DELETE /api/admin/materials/:id
 * Material qeydini silmək
 */
const deleteMaterial = async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await prisma.projectMaterial.findUnique({
      where: { id },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Silinəcək material qeydi tapılmadı.',
        error_code: 'MATERIAL_NOT_FOUND',
        details: null,
      });
    }

    await prisma.$transaction(async (tx) => {
      await tx.projectMaterial.delete({
        where: { id },
      });

      await tx.auditLog.create({
        data: {
          actor_id: req.user.id,
          action: 'DELETE_PROJECT_MATERIAL',
          target_table: 'project_materials',
          target_id: id,
          details: {
            project_id: existing.project_id,
            item_name: existing.item_name,
            total_cost: Number(existing.total_cost),
          },
        },
      });
    });

    return res.status(200).json({
      success: true,
      message: 'Material qeydi uğurla silindi və layihə maya dəyəri yenidən hesablandı.',
      data: {
        id,
        deleted: true,
      },
    });
  } catch (error) {
    console.error('deleteMaterial xətası:', error);
    return res.status(500).json({
      success: false,
      message: 'Daxili server xətası baş verdi.',
      error_code: 'INTERNAL_SERVER_ERROR',
      details: null,
    });
  }
};

module.exports = {
  getProjectMaterials,
  createProjectMaterial,
  deleteMaterial,
};
