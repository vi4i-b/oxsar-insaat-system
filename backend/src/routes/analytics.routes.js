const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analytics.controller');
const { verifyToken, requireAdmin } = require('../middlewares/auth');

router.use(verifyToken, requireAdmin);

// GET /api/admin/analytics/summary
router.get('/summary', analyticsController.getSummary);

module.exports = router;
