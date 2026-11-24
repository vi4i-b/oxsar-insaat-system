const express = require('express');
const router = express.Router();

const authRoutes = require('./auth.routes');
const projectRoutes = require('./project.routes');
const materialRoutes = require('./material.routes');
const payrollRoutes = require('./payroll.routes');
const analyticsRoutes = require('./analytics.routes');
const workerRoutes = require('./worker.routes');
const workTypeRoutes = require('./workType.routes');

// Admin alt-marşrutları
// Qeyd: materialRoutes /projects/:projectId/materials yolunu əhatə etdiyi üçün
// projectRoutes-dan əvvəl qoşulur
router.use('/', authRoutes);
router.use('/', materialRoutes);
router.use('/', payrollRoutes);
router.use('/', analyticsRoutes);
router.use('/projects', projectRoutes);
router.use('/workers', workerRoutes);
router.use('/work-types', workTypeRoutes);

module.exports = router;
