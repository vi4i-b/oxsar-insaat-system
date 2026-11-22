const express = require('express');
const router = express.Router();
const workTypeController = require('../controllers/workType.controller');
const { verifyToken, requireAdmin } = require('../middlewares/auth');

// Bütün iş növü idarəetmə marşrutları Müdir hüququ tələb edir
router.use(verifyToken, requireAdmin);

// GET /api/admin/work-types
router.get('/', workTypeController.getWorkTypes);

// POST /api/admin/work-types
router.post('/', workTypeController.createWorkType);

// PUT /api/admin/work-types/:id
router.put('/:id', workTypeController.updateWorkType);

module.exports = router;
