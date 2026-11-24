const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analytics.controller');
const { verifyToken, requireAdmin } = require('../middlewares/auth');

// GET /api/admin/analytics/summary
router.get(
  '/analytics/summary',
  verifyToken,
  requireAdmin,
  analyticsController.getSummary
);

// GET /api/admin/audit-logs
router.get(
  '/audit-logs',
  verifyToken,
  requireAdmin,
  analyticsController.getAuditLogs
);

// PATCH /api/admin/daily-logs/:id
router.patch(
  '/daily-logs/:id',
  verifyToken,
  requireAdmin,
  analyticsController.overrideDailyLog
);

module.exports = router;
