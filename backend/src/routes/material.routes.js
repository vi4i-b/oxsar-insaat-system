const express = require('express');
const router = express.Router();
const materialController = require('../controllers/material.controller');
const { verifyToken, requireAdmin } = require('../middlewares/auth');

// GET /api/admin/projects/:projectId/materials
router.get(
  '/projects/:projectId/materials',
  verifyToken,
  requireAdmin,
  materialController.getProjectMaterials
);

// POST /api/admin/projects/:projectId/materials
router.post(
  '/projects/:projectId/materials',
  verifyToken,
  requireAdmin,
  materialController.createProjectMaterial
);

// DELETE /api/admin/materials/:id
router.delete(
  '/materials/:id',
  verifyToken,
  requireAdmin,
  materialController.deleteMaterial
);

module.exports = router;
