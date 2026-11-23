const express = require('express');
const router = express.Router();

const authRoutes = require('./auth.routes');
const workerRoutes = require('./worker.routes');
const workTypeRoutes = require('./workType.routes');
const analyticsRoutes = require('./analytics.routes');

// Admin alt-marşrutları
router.use('/', authRoutes);
router.use('/workers', workerRoutes);
router.use('/work-types', workTypeRoutes);
router.use('/analytics', analyticsRoutes);

module.exports = router;
