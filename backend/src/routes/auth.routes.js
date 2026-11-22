const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { verifyToken, requireAdmin } = require('../middlewares/auth');

// POST /api/admin/login
router.post('/login', authController.login);

// GET /api/admin/me
router.get('/me', verifyToken, requireAdmin, authController.getMe);

module.exports = router;
