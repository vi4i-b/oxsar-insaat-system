const express = require('express');
const router = express.Router();
const workerController = require('../controllers/worker.controller');
const { verifyToken, requireAdmin } = require('../middlewares/auth');

// Bütün işçi idarəetmə marşrutları Müdir hüququ tələb edir
router.use(verifyToken, requireAdmin);

// GET /api/admin/workers
router.get('/', workerController.getWorkers);

// POST /api/admin/workers
router.post('/', workerController.createWorker);

// PUT /api/admin/workers/:id
router.put('/:id', workerController.updateWorker);

// PATCH /api/admin/workers/:id/toggle-active
router.patch('/:id/toggle-active', workerController.toggleActive);

module.exports = router;
