# Oxşar İnşaat — Müdir Portalı Frontend (`/admin`)

`docs/API_CONTRACT.md` (v1.0.0) sənədinə uyğun hazırlanmış **React + TypeScript + Vite + Tailwind CSS** Müdir Portalı.

## İşə Salma

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

Brauzerdə açılır: `http://localhost:5173/admin/login`

## Backend İnteqrasiyası (`API_CONTRACT.md`)

- **Baza URL:** `VITE_API_URL` (default: `http://localhost:5000/api/admin`)
- **JWT Token açarı:** `localStorage` → `oxsar_admin_token`
- **Request Header:** `Authorization: Bearer <token>`
- **401 Xəta İdarəetməsi:** Token silinir və `/admin/login` səhifəsinə yönləndirilir

## İnteqrasiya Edilmiş Modullar (25 Endpoint)

1. **Auth (`POST /login`, `GET /me`)** — JWT giriş, F5 sessiya yoxlanışı, 401 avtomatik yönləndirmə
2. **Analitika (`GET /analytics/summary`)** — KPI kartları, tarix filtri, gəlir-xərc-mənfəət qrafiki və layihə rentabellik cədvəli
3. **Layihələr & Təkliflər (`GET/POST/PUT/DELETE /projects`, `PATCH /projects/:id/status`)** — Təklif generatoru, canlı m²/gün/qiymət kalkulyatoru, WhatsApp Magic-Link paylaşımı, çap edilə bilən PDF təklif, məcburi `pause_reason`
4. **Gündəlik Kamera Hesabatları (`PATCH /daily-logs/:id`)** — Səhər/axşam foto baxışı və min. 10 simvol audit səbəbli Müdir m² düzəlişi
5. **Obyekt Materialları (`GET/POST /projects/:projectId/materials`, `DELETE /materials/:id`)** — Maya dəyəri uçotu
6. **İşçilər, Avans və Maaş (`GET/POST/PUT /workers`, `PATCH /toggle-active`, `POST /advances`, `GET /workers/:id/advances`, `POST /workers/:id/settle`, `GET /salary-settlements`)** — 4 rəqəmli Usta PIN, sürətli `+ Avans Ver`, dövr bağlanışı və arxiv
7. **İş Növləri & Normativlər (`GET/POST/PUT /work-types`)** — Gündəlik m² normaları və baza qiymətləri
8. **Audit Jurnalı (`GET /audit-logs`)** — Cədvəl filtri və səhifələmə ilə tam təhlükəsizlik jurnalı
