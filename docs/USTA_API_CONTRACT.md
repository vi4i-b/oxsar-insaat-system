# 👷 "OXŞAR İNŞAAT" — İŞÇİ (USTA) MOBİL PORTALI (`/usta`) API CONTRACT
**Versiya:** 1.0.0  
**Tarix:** 2026-11-25  
**Saat Qurşağı:** `Asia/Baku` (UTC+04:00)  
**Təyinat:** Frontend (`React + TypeScript + Vite` — Məhəmməd) və Backend (`Node.js + Express + Prisma + Multer + Supabase` — Cəlil) arasında **İşçi (Usta) Sahə Mobil Portalı (`/usta`)** üçün 100% uyğun texniki müqavilə sənədi.

---

## 1. Qlobal Qaydalar və Arxitektura Standartları

### 1.1. Baza URL və Marşrut Prefiksi
- **Lokal İnkişaf:** `http://localhost:5000/api/usta`
- **İstehsalat (Production):** `https://api.oxsarinsaat.az/api/usta` *(və ya `VITE_API_URL` + `/usta`)*
- Express qoşulması (`backend/src/index.js`):
  ```js
  app.use('/api/usta', ustaRoutes);
  ```

### 1.2. Autentifikasiya və Rol Sərhədi
- `/api/usta/login` istisna olmaqla bütün `/api/usta/*` endpoint-ləri **JWT Bearer Token** ilə qorunur.
- Frontend Usta tokenini Müdir tokenindən ayrı açarda saxlayır:
  - `localStorage` açarı: **`oxsar_usta_token`**
- **Giriş Hüququ:** Yalnız `role === 'USTA'` və `is_active === true` olan işçilər daxil ola bilər.
  - `FEHLE` rolu sistemə daxil olmur (`403 ACCESS_DENIED`).
  - Deaktiv edilmiş usta (`is_active === false`) həm girişdə, həm də sonrakı sorğularda rədd edilir (`403 ACCOUNT_DEACTIVATED`).

### 1.3. Canlı Kamera Fayl Yükləmə Standartı (`multipart/form-data`)
- Səhər və axşam çekinlərində qalereyadan köhnə şəkil seçilməsi **Frontend tərəfində WebRTC canlı kamera kilidi ilə bağlanıb**.
- Çəkilən canlı foto (`image/jpeg`, `image/webp`) və ya qısa 5–10 saniyəlik video (`video/webm`, `video/mp4`) **`multipart/form-data`** formatında `media` sahəsi ilə göndərilir.
- Backend `multer` (`memoryStorage`, max `25 MB`) vasitəsilə faylı qəbul edib Supabase Storage bucket-ə (`daily-logs` və ya `logs`) yükləyir və açıq URL-i `daily_logs.morning_media_url` / `evening_media_url` sütununa yazır.

### 1.4. Standart Cavab Şablonu (`API_CONTRACT.md` ilə eyni)
- **Uğurlu (`200`, `201`):**
  ```json
  {
    "success": true,
    "message": "Əməliyyat uğurla icra olundu.",
    "data": { ... }
  }
  ```
- **Xəta (`400`, `401`, `403`, `404`, `409`, `500`):**
  ```json
  {
    "success": false,
    "message": "Xəta mesajı",
    "error_code": "ERROR_CODE",
    "details": null
  }
  ```

---

## 2. Endpoint Detalları

### 2.1. Usta PIN Girişi (`POST /api/usta/login`)
- **Təyinat:** Ustanın telefon nömrəsi və 4 rəqəmli PIN kodu (`pin_hash` ilə `bcrypt.compare`) vasitəsilə sürətli girişi.
- **Auth:** Public
- **Request Body (`application/json`):**
  ```json
  {
    "phone": "+994507776655",
    "pin": "4821"
  }
  ```
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "message": "Xoş gəldiniz, Rüstəm usta!",
    "data": {
      "access_token": "<jwt_token>",
      "token_type": "Bearer",
      "expires_in": 604800,
      "usta": {
        "id": "w-01-usta-rustem",
        "full_name": "Şirinov Rüstəm Qəzənfər oğlu",
        "role": "USTA",
        "phone": "+994507776655",
        "daily_wage": 50.00,
        "is_active": true
      }
    }
  }
  ```
- **Xətalar:**
  - `400 VALIDATION_ERROR`: Telefon və ya 4 rəqəmli PIN daxil edilməyib.
  - `401 INVALID_CREDENTIALS`: Telefon nömrəsi və ya PIN yanlışdır.
  - `403 ACCESS_DENIED`: İstifadəçinin rolu `USTA` deyil.
  - `403 ACCOUNT_DEACTIVATED`: Hesab müdir tərəfindən deaktiv edilib.

---

### 2.2. Cari Usta Profili (`GET /api/usta/me`)
- **Təyinat:** Səhifə yeniləndikdə (`F5`) mövcud `oxsar_usta_token` etibarlılığını və cari usta profilini yoxlamaq.
- **Auth:** `Bearer <oxsar_usta_token>`
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "message": "Usta profili təqdim edildi.",
    "data": {
      "id": "w-01-usta-rustem",
      "full_name": "Şirinov Rüstəm Qəzənfər oğlu",
      "role": "USTA",
      "phone": "+994507776655",
      "daily_wage": 50.00,
      "is_active": true
    }
  }
  ```

---

### 2.3. Aktiv Obyektlər və Mərhələlər Siyahısı (`GET /api/usta/projects`)
- **Təyinat:** Yalnız `status === 'AKTIV'` olan obyektləri qaytarır (`GOZLEMEDE`, `DAYANDIRILIB`, `TAMAMLANDI`, `PASSIV` obyektlər ustaya göstərilmir).
- **Təhlükəsizlik Qaydası:** Cavabda `price_per_m2`, `total_amount`, `materials_cost`, `net_profit` kimi kommersiya sirri olan maliyyə sahələri **göndərilmir**.
- **Auth:** `Bearer <oxsar_usta_token>`
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "message": "Aktiv obyektlərin siyahısı təqdim edildi.",
    "data": [
      {
        "id": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
        "name": "Badamdar Villa",
        "address": "Bakı şəhəri, Səbail rayonu, Badamdar qəs. 3-cü massiv ev 14",
        "client_name": "Rüstəm Şirinov",
        "supply_type": "MATERIALLI",
        "material_brand": "TechnoNICOL Premium",
        "total_target_m2": 1800.00,
        "total_completed_m2": 1050.00,
        "progress_percent": 58.3,
        "is_ready_for_otp": false,
        "stages": [
          {
            "id": "stage-01",
            "work_type_id": "wt-astar-01",
            "work_type_name": "Astar və Təmizlik",
            "daily_norm_m2": 600.00,
            "stage_name": "Mərhələ 1: Astar və səthin təmizlənməsi",
            "target_m2": 600.00,
            "completed_m2": 600.00,
            "remaining_m2": 0.00,
            "progress_percent": 100.0,
            "is_completed": true
          },
          {
            "id": "stage-02",
            "work_type_id": "wt-surme-02",
            "work_type_name": "Sürmə İzolyasiya",
            "daily_norm_m2": 500.00,
            "stage_name": "Mərhələ 2: Sürmə izolyasiya 1-ci və 2-ci qat",
            "target_m2": 600.00,
            "completed_m2": 450.00,
            "remaining_m2": 150.00,
            "progress_percent": 75.0,
            "is_completed": false
          }
        ]
      }
    ]
  }
  ```

---

### 2.4. Briqada Köməkçiləri Siyahısı (`GET /api/usta/helpers`)
- **Təyinat:** Səhər çekini zamanı ustanın yanında işləyən aktiv fəhlələri (və ya digər aktiv ustaları, `id !== req.user.id`) seçmək üçün siyahı.
- **Auth:** `Bearer <oxsar_usta_token>`
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "message": "Briqada heyəti siyahısı təqdim edildi.",
    "data": [
      {
        "id": "w-02-fehle-eli",
        "full_name": "Həsənov Əli Kamran oğlu",
        "role": "FEHLE",
        "phone": "+994518889900"
      },
      {
        "id": "w-04-fehle-elvin",
        "full_name": "Məmmədov Elvin Rasim oğlu",
        "role": "FEHLE",
        "phone": "+994703214567"
      }
    ]
  }
  ```

---

### 2.5. Bu Günki Növbə Vəziyyəti (`GET /api/usta/daily-logs/today`)
- **Təyinat:** Ustanın `Asia/Baku` tarixi üzrə hazırda açıq (`status === 'OPEN'`) növbəsinin olub-olmadığını və bu gün bağladığı (`CLOSED`) hesabatları qaytarır.
- **Auth:** `Bearer <oxsar_usta_token>`
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "message": "Bu günki iş növbəsi məlumatı gətirildi.",
    "data": {
      "today_date": "2026-11-25",
      "open_log": {
        "id": "log-today-01",
        "project_id": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
        "project_name": "Badamdar Villa",
        "project_address": "Bakı şəhəri, Səbail rayonu, Badamdar qəs. 3-cü massiv ev 14",
        "work_date": "2026-11-25",
        "morning_time": "08:45:12",
        "morning_media_url": "https://.../logs/morning_1795.jpg",
        "helpers": [
          {
            "id": "w-02-fehle-eli",
            "full_name": "Həsənov Əli Kamran oğlu",
            "role": "FEHLE"
          }
        ],
        "status": "OPEN"
      },
      "closed_logs_today": []
    }
  }
  ```

---

### 2.6. Addım 1: Səhər Çekini — "İŞƏ BAŞLADIM" (`POST /api/usta/daily-logs/morning`)
- **Təyinat:** Ustanın seçilmiş aktiv obyektdə iş gününü açması.
- **Biznes Qaydası:**
  - Eyni ustada eyni vaxtda bağlanmamış (`OPEN`) növbə varsa, ikinci açıq növbəyə icazə verilmir (`409 OPEN_SHIFT_ALREADY_EXISTS`).
  - `media` faylı məcburidir (`400 MEDIA_REQUIRED`).
- **Auth:** `Bearer <oxsar_usta_token>`
- **Content-Type:** `multipart/form-data`
- **Form Fields:**
  - `project_id` *(string/uuid, required)*: Seçilmiş aktiv layihənin ID-si.
  - `helper_ids` *(string, optional)*: JSON massiv formatında işçi ID-ləri (məs: `'["w-02-fehle-eli"]'`) və ya boş `'[]'`.
  - `media` *(File, required)*: Canlı kameradan çəkilmiş foto (`image/*`) və ya 5–10 san. video (`video/*`).
- **Response `201 Created`:**
  ```json
  {
    "success": true,
    "message": "Səhər çekini təsdiqləndi. İş gününüz uğurla başladı!",
    "data": {
      "id": "log-today-01",
      "project_id": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
      "project_name": "Badamdar Villa",
      "work_date": "2026-11-25",
      "morning_time": "08:45:12",
      "morning_media_url": "https://.../logs/morning_1795.jpg",
      "helper_ids": ["w-02-fehle-eli"],
      "status": "OPEN"
    }
  }
  ```

---

### 2.7. Addım 2: Axşam Çekini — "İŞ GÜNÜNÜ BİTİR" (`POST /api/usta/daily-logs/:id/evening`)
- **Təyinat:** Usta açıq (`OPEN`) iş gününü bağlayır, işlədiyi mərhələni, görülən `done_m2` həcmini, material qeydini və canlı kamera foto/videosunu göndərir.
- **Atomar Backend Məntiqi (`prisma.$transaction`):**
  1. Loqun həmin ustaya aid olduğunu və `status === 'OPEN'` olduğunu yoxlayır.
  2. Mərhələnin qalıq həcmini yoxlayır: `remaining_m2 = stage.target_m2 - stage.completed_m2`. Əgər `done_m2 > remaining_m2` olarsa `400 EXCEEDS_STAGE_REMAINING_M2` qaytarır.
  3. Anomaliya yoxlanışı: `is_below_norm = done_m2 < stage.work_type.daily_norm_m2`.
  4. `daily_logs` qeydini yeniləyir: `stage_id`, `done_m2`, `material_note`, `evening_time`, `evening_media_url`, `is_below_norm`, `status: 'CLOSED'`.
  5. `project_stages.completed_m2` dəyərini həmin mərhələnin `CLOSED` loqlarının cəmi ilə yeniləyir.
  6. `CLOSED` statusa keçdiyi üçün `computeWorkerCurrentPeriod` vasitəsilə həm ustanın, həm də `helper_ids`-dəki işçilərin balansına o günkü əmək haqqı avtomatik hesablanır.
- **Auth:** `Bearer <oxsar_usta_token>`
- **Content-Type:** `multipart/form-data`
- **Form Fields:**
  - `stage_id` *(string/uuid, required)*
  - `done_m2` *(number/string, required, positive)*
  - `material_note` *(string, optional)*
  - `media` *(File, required)*: Görülmüş işin canlı kamera fotosu və ya videosu.
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "message": "Axşam hesabatı təsdiqləndi! Görülən m² və günün əmək haqqı qeydə alındı.",
    "data": {
      "id": "log-today-01",
      "status": "CLOSED",
      "evening_time": "18:10:05",
      "evening_media_url": "https://.../logs/evening_1795.jpg",
      "done_m2": 150.00,
      "is_below_norm": true,
      "stage_progress": {
        "id": "stage-02",
        "completed_m2": 600.00,
        "target_m2": 600.00,
        "progress_percent": 100.0
      },
      "project_progress": {
        "total_completed_m2": 1200.00,
        "total_target_m2": 1800.00,
        "progress_percent": 66.7,
        "is_ready_for_otp": false
      }
    }
  }
  ```
- **Xətalar:**
  - `400 EXCEEDS_STAGE_REMAINING_M2`: Daxil edilən m² mərhələnin qalıq həcmindən çoxdur.
  - `400 MEDIA_REQUIRED`: Axşam kamera fotosu/videosu əlavə edilməyib.
  - `409 LOG_ALREADY_CLOSED`: Bu növbə artıq bağlanıb (usta sonradan dəyişə bilməz).

---

### 2.8. Müştəri OTP Kodu ilə Təhvil Kilidi (`POST /api/usta/projects/:id/complete-otp`)
- **Təyinat:** Layihənin bütün mərhələləri 100% tamamlandıqda (`total_completed_m2 >= total_target_m2`), müştərinin öz Magic-Link səhifəsində gördüyü 4 rəqəmli `otp_code` ilə layihənin rəsmən `TAMAMLANDI` statusuna keçirilməsi.
- **Auth:** `Bearer <oxsar_usta_token>`
- **Request Body (`application/json`):**
  ```json
  {
    "otp_code": "8492"
  }
  ```
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "message": "OTP təsdiqləndi! Layihə rəsmən 'Tamamlandı' olaraq bağlandı.",
    "data": {
      "project_id": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
      "status": "TAMAMLANDI",
      "completed_at": "2026-11-25T18:20:00+04:00"
    }
  }
  ```
- **Xətalar:**
  - `400 PROJECT_NOT_100_PERCENT`: Bütün mərhələlər 100% bitmədən təhvil verilə bilməz.
  - `400 INVALID_OTP_CODE`: Müştəri təhvil OTP kodu yanlışdır.

---

### 2.9. Addım 3: "Mənim Hesabım" — Şəxsi Balans və Tarixçə (`GET /api/usta/wallet`)
- **Təyinat:** Ustanın yalnız oxuma (`Read-Only`) rejimində cari dövr üzrə işlədiyi günləri, hesablanmış maaşını, götürdüyü avansları, xalis alacağı qalığı və son hesabatlarını görməsi (`computeWorkerCurrentPeriod` ilə hesablanır).
- **Auth:** `Bearer <oxsar_usta_token>`
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "message": "Şəxsi balans məlumatları gətirildi.",
    "data": {
      "worker": {
        "id": "w-01-usta-rustem",
        "full_name": "Şirinov Rüstəm Qəzənfər oğlu",
        "role": "USTA",
        "phone": "+994507776655",
        "daily_wage": 50.00
      },
      "current_period": {
        "period_start": "2026-11-01",
        "worked_days": 14,
        "gross_salary": 700.00,
        "total_advances": 240.00,
        "net_balance": 460.00,
        "last_worked_date": "2026-11-21"
      },
      "advances": [
        {
          "id": "adv-9912",
          "amount": 25.00,
          "given_date": "2026-11-21",
          "note": "Günorta yeməyi və yol xərci",
          "created_at": "2026-11-21T13:20:00+04:00"
        }
      ],
      "recent_logs": [
        {
          "id": "log-01",
          "work_date": "2026-11-21",
          "project_name": "Badamdar Villa",
          "stage_name": "Mərhələ 2: Sürmə izolyasiya",
          "done_m2": 300.00,
          "morning_time": "08:45:12",
          "evening_time": "18:15:40",
          "status": "CLOSED",
          "is_below_norm": false
        }
      ],
      "settlements": [
        {
          "id": "settle-20261031-01",
          "period_start": "2026-10-01",
          "period_end": "2026-10-31",
          "worked_days": 22,
          "gross_salary": 1100.00,
          "total_advances": 350.00,
          "net_paid": 750.00,
          "paid_at": "2026-10-31T19:15:00+04:00"
        }
      ]
    }
  }
  ```

---

## 3. Endpoint Xülasə Cədvəli

| HTTP Metodu | URL | Təyinat | Format | İcazə |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/usta/login` | Telefon + 4 rəqəmli PIN ilə giriş | `JSON` | Public |
| `GET` | `/api/usta/me` | Cari usta sessiyasının yoxlanışı | `JSON` | Usta |
| `GET` | `/api/usta/projects` | Yalnız `AKTIV` obyektlər və mərhələ qalıqları | `JSON` | Usta |
| `GET` | `/api/usta/helpers` | Briqada seçimi üçün aktiv fəhlə/usta siyahısı | `JSON` | Usta |
| `GET` | `/api/usta/daily-logs/today` | Bu günki açıq (`OPEN`) və bağlı növbələr | `JSON` | Usta |
| `POST` | `/api/usta/daily-logs/morning` | Səhər çekini + canlı kamera foto/video | `FormData` | Usta |
| `POST` | `/api/usta/daily-logs/:id/evening` | Axşam çekini + m² + canlı kamera foto/video | `FormData` | Usta |
| `POST` | `/api/usta/projects/:id/complete-otp` | 100% bitmiş obyekti müştəri OTP-si ilə bağlamaq | `JSON` | Usta |
| `GET` | `/api/usta/wallet` | Şəxsi maaş, avans və iş günü balansı (Read-Only) | `JSON` | Usta |
