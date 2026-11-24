require('dotenv').config();
const express = require('express');
const cors = require('cors');
const adminRoutes = require('./routes/index');

const app = express();
const PORT = process.env.PORT || 5000;

// CORS konfiqurasiyası (Lokal Vite + *.vercel.app + FRONTEND_URL)
const envOrigins = (process.env.FRONTEND_URL || '')
  .split(',')
  .map((url) => url.trim().replace(/\/+$/, ''))
  .filter(Boolean);

const allowedOrigins = new Set([
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  ...envOrigins,
]);

const vercelOriginRegex = /^https:\/\/[a-zA-Z0-9-]+\.vercel\.app$/;

app.use(
  cors({
    origin: (origin, callback) => {
      // Server-to-server, curl, health-check və mobil sorğular (Origin başlığı olmadan)
      if (!origin) {
        return callback(null, true);
      }

      const normalizedOrigin = origin.replace(/\/+$/, '');
      if (allowedOrigins.has(normalizedOrigin) || vercelOriginRegex.test(normalizedOrigin)) {
        return callback(null, true);
      }

      const corsErr = new Error('CORS policy: Origin not allowed');
      corsErr.status = 403;
      return callback(corsErr);
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })
);

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Sistem statusu (Health Check - Koyeb / Render)
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
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

// Serveri dinləməyə başlamaq (0.0.0.0 - Cloud/Docker uyğunluğu)
app.listen(PORT, '0.0.0.0', () => {
  console.log(`=========================================`);
  console.log(`🚀 Oxşar İnşaat API Serveri işə düşdü!`);
  console.log(`📍 Host: 0.0.0.0 | Port: ${PORT}`);
  console.log(`⏰ Saat Qurşağı: Asia/Baku (+04:00)`);
  console.log(`=========================================`);
});

module.exports = app;
