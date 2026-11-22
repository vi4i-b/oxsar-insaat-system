require('dotenv').config();
const express = require('express');
const cors = require('cors');
const adminRoutes = require('./routes/index');

const app = express();
const PORT = process.env.PORT || 5000;

// CORS konfiqurasiyası
app.use(
  cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Sistem statusu (Health Check)
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Oxşar İnşaat Backend API işlək vəziyyətdədir.',
    timestamp: new Date().toISOString(),
    timezone: 'Asia/Baku',
  });
});

// Müdür Portalı API marşrutları
app.use('/api/admin', adminRoutes);

// Tapılmayan marşrutlar (404)
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Sorğu edilən marşrut tapılmadı: ${req.method} ${req.originalUrl}`,
    error_code: 'ROUTE_NOT_FOUND',
    details: null,
  });
});

// Qlobal xəta emalı (Error Handler)
app.use((err, req, res, next) => {
  console.error('Qlobal Server Xətası:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Daxili server xətası baş verdi.',
    error_code: err.code || 'INTERNAL_SERVER_ERROR',
    details: process.env.NODE_ENV === 'development' ? err.stack : null,
  });
});

// Serveri dinləməyə başlamaq
app.listen(PORT, () => {
  console.log(`=========================================`);
  console.log(`🚀 Oxşar İnşaat API Serveri işə düşdü!`);
  console.log(`📍 Port: ${PORT}`);
  console.log(`🌐 Base URL: http://localhost:${PORT}/api/admin`);
  console.log(`⏰ Saat Qurşağı: Asia/Baku (+04:00)`);
  console.log(`=========================================`);
});

module.exports = app;
