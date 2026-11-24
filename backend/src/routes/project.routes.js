const express = require('express');
const router = express.Router();
const projectController = require('../controllers/project.controller');
const { verifyToken, requireAdmin } = require('../middlewares/auth');

router.use(verifyToken, requireAdmin);

// GET /api/admin/projects
router.get('/', projectController.getProjects);

// GET /api/admin/projects/:id
router.get('/:id', projectController.getProjectById);

// POST /api/admin/projects
router.post('/', projectController.createProject);

// PUT /api/admin/projects/:id
router.put('/:id', projectController.updateProject);

// PATCH /api/admin/projects/:id/status
router.patch('/:id/status', projectController.changeProjectStatus);

// DELETE /api/admin/projects/:id
router.delete('/:id', projectController.deleteProject);

module.exports = router;
