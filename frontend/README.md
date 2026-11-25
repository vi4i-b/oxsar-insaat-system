# Oxşar İnşaat — Frontend (`/admin` & `/usta`)

`docs/API_CONTRACT.md` və `docs/USTA_API_CONTRACT.md` sənədlərinə 100% uyğun hazırlanmış **React + TypeScript + Vite + Tailwind CSS** vahid frontend tətbiqi.

## İşə Salma

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

- **Müdir Portalı (`/admin`):** `http://localhost:5173/admin/login`
- **İşçi / Usta Sahə Portalı (`/usta`):** `http://localhost:5173/usta/login`

## Backend İnteqrasiyası

- **Baza URL (`VITE_API_URL`):** `http://localhost:5000/api`
  - Müdir sorğuları avtomatik `/api/admin/*` ünvanına gedir (`localStorage`: `oxsar_admin_token`)
  - Usta sorğuları avtomatik `/api/usta/*` ünvanına gedir (`localStorage`: `oxsar_usta_token`)

## Hazır Portallar

### 1. Müdir Portalı (`/admin`) — 25 Endpoint (`docs/API_CONTRACT.md`)
- Analitika Dashboard, Layihələr & 5 dəqiqəlik PDF/WhatsApp Təklif Generatoru, Gündəlik Kamera Loqlarına Müdir düzəlişi, Obyekt Materialları, İşçilər/Avans/Maaş bağlanışı, İş Növləri & Normativlər, Audit Jurnalı.

### 2. İşçi (Usta) Mobil Portalı (`/usta`) — 9 Endpoint (`docs/USTA_API_CONTRACT.md`)
- **4 Rəqəmli PIN Girişi (`/usta/login`):** Sahə üçün iri sensor düyməli rəqəm klaviaturası.
- **Gündəlik Sahə İcrası (`/usta`):**
  - **Səhər Çekini (`İŞƏ BAŞLADIM`):** Yalnız `AKTIV` obyektlər, dinamik briqada köməkçisi seçimi və WebRTC **Canlı Kamera Audit Kilidi** (qalereya bağlıdır, foto üzərinə `Asia/Baku` zaman damğası vurulur və ya maks. 10 san. video çəkilir).
  - **Axşam Çekini (`İŞ GÜNÜNÜ BİTİR`):** Mərhələ seçimi, qalıq həcmdən artıq m² kilidi (`EXCEEDS_STAGE_REMAINING_M2`), normadan aşağı icra xəbərdarlığı, material qeydi və canlı kamera kilidi.
  - **Müştəri OTP Təhvil Kilidi:** 100% bitmiş obyekti müştərinin 4 rəqəmli OTP kodu ilə `TAMAMLANDI` statusuna bağlamaq.
- **Mənim Hesabım (`/usta/wallet`):** Yalnız oxuma (`Read-Only`) rejimində cari dövr üzrə işlənmiş günlər, ümumi maaş, götürülmüş avanslar, xalis qalıq və keçmiş ödənişlər arxivi.
