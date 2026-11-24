const express = require('express');
const router = express.Router();
const payrollController = require('../controllers/payroll.controller');
const { verifyToken, requireAdmin } = require('../middlewares/auth');

// POST /api/admin/advances
router.post('/advances', verifyToken, requireAdmin, payrollController.createAdvance);

// GET /api/admin/workers/:id/advances
router.get('/workers/:id/advances', verifyToken, requireAdmin, payrollController.getWorkerAdvances);

// POST /api/admin/workers/:id/settle
router.post('/workers/:id/settle', verifyToken, requireAdmin, payrollController.settleWorkerPayroll);

// GET /api/admin/salary-settlements
router.get('/salary-settlements', verifyToken, requireAdmin, payrollController.getSalarySettlements);

module.exports = router;
