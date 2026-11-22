# 📐 "OXŞAR İNŞAAT" — MÜDÜR PORTALI (`/admin`) API CONTRACT
**Versiya:** 1.0.0  
**Tarix:** 2026-11-22  
**Saat Qurşağı:** `Asia/Baku` (UTC+04:00)  
**Təyinat:** Frontend (React + Vite — Məhəmməd) və Backend (Node.js + Express + Prisma — Cəlil) arasında 100% uyğunluq üçün texniki müqavilə sənədi.

---

## 1. Qlobal Qaydalar və Arxitektura Standartları

### 1.1. Baza URL və Mühitlər
- **Lokal İnkişaf (Local Development):** `http://localhost:5000/api/admin`
- **İstehsalat (Production):** `https://api.oxsarinsaat.az/api/admin`

### 1.2. Autentifikasiya və Təhlükəsizlik
- Bütün `/api/admin/*` endpoint-ləri (giriş `login` istisna olmaqla) qorunur.
- Sorğunun başlıqlarında (Headers) mütləq etibarlı **JWT Bearer Token** göndərilməlidir:
  ```http
  Authorization: Bearer <jwt_access_token>
  Content-Type: application/json
  ```
- **JWT Payload strukturu:**
  ```json
  {
    "worker_id": "c8b3f210-91a4-4f51-bfa6-8ef3e6a981c2",
    "full_name": "Qasımov Oxşar Əli oğlu",
    "role": "ADMIN",
    "phone": "+994501234567",
    "iat": 1795372800,
    "exp": 1795977600
  }
  ```
- Əgər token yoxdursa, vaxtı bitibsə və ya istifadəçinin rolu `ADMIN` deyilsə, sorğu dərhal `401 Unauthorized` və ya `403 Forbidden` ilə rədd edilir.

### 1.3. Tarix, Vaxt və Saat Qurşağı Standartı
- Verilənlər bazası: **Supabase PostgreSQL**.
- Saat qurşağı məcburi olaraq **`Asia/Baku` (+04:00)** qəbul edilir.
- Yalnız tarix tələb olunan sahələr: `YYYY-MM-DD` (məs: `"2026-11-22"`).
- Zaman damğaları (Timestamps): ISO-8601 formatı (`YYYY-MM-DDTHH:mm:ss+04:00`, məs: `"2026-11-22T08:45:00+04:00"`).

### 1.4. Naming Convention (Adlandırma Qaydası)
- JSON sahələrinin açar adları: **`snake_case`** (məs: `daily_wage`, `client_phone`, `magic_token`, `total_amount`).
- URL parametrləri: **`kebab-case`** və ya **`camelCase`** URL paths (məs: `/toggle-active`, `projectId`).

### 1.5. Standart Cavab Strukturları

#### Uğurlu Cavab Şablonu (`200 OK`, `201 Created`):
```json
{
  "success": true,
  "message": "Əməliyyat uğurla icra olundu.",
  "data": { ... }
}
```

#### Standart Xəta Şablonu (`400`, `401`, `403`, `404`, `409`, `500`):
```json
{
  "success": false,
  "message": "İstifadəçi adı və ya şifrə yanlışdır.",
  "error_code": "INVALID_CREDENTIALS",
  "details": null
}
```

---

## 2. Verilənlər Bazası Sxemi və Əlaqələri (Reference)

```mermaid
erDiagram
    workers ||--o{ daily_logs : "usta_id"
    workers ||--o{ advances : "worker_id"
    workers ||--o{ salary_settlements : "worker_id"
    projects ||--o{ project_stages : "project_id"
    projects ||--o{ daily_logs : "project_id"
    projects ||--o{ project_materials : "project_id"
    work_types ||--o{ project_stages : "work_type_id"
    project_stages ||--o{ daily_logs : "stage_id"
    workers ||--o{ audit_logs : "actor_id"
```

1. **`workers`**: Şirkətin işçi heyəti (`ADMIN`, `USTA`, `FEHLE`).
2. **`work_types`**: İzolyasiya iş növləri, m² gündəlik normaları və baza qiymətləri.
3. **`projects`**: Obyektlər, müştəri məlumatları, status və Magic-Link tokenləri.
4. **`project_stages`**: Layihənin mərhələləri (`target_m2`, `completed_m2`).
5. **`daily_logs`**: Səhər və axşam çəkilən canlı kamera hesabatları, görülən m².
6. **`advances`**: İşçilərə gün içi verilən əlbəəl avanslar (20–25 AZN).
7. **`salary_settlements`**: Həftəlik/aylıq rəsmi bağlanmış maaş hesablaşmaları.
8. **`project_materials`**: Obyektə göndərilən materialların maya dəyəri uçotu.
9. **`audit_logs`**: Kritik dəyişikliklərin və müdir manual düzəlişlərinin jurnalı.

---

## 3. MODUL 1: Autentifikasiya və Profil (Auth)

### 3.1. Müdür Girişi (Login)
- **Təyinat:** Şirkət rəhbərinin telefon nömrəsi və şifrəsi ilə sistemə daxil olması. Uğurlu olduqda JWT token qaytarır.
- **HTTP Metodu və URL:** `POST /api/admin/login`
- **Headers:** `Content-Type: application/json`
- **Query / URL Params:** Yoxdur.
- **Request Body:**
  ```json
  {
    "phone": "+994501234567",
    "password": "GucluSifre2026!"
  }
  ```
  - `phone` *(string, required)*: Azərbaycan formatında telefon nömrəsi.
  - `password` *(string, required)*: Müdürün sistem şifrəsi.

- **Response:**
  - **`200 OK` (Uğurlu):**
    ```json
    {
      "success": true,
      "message": "Sistemə uğurla daxil oldunuz.",
      "data": {
        "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ3b3JrZXJfaWQiOiJjOGIzZjIxMC05MWE0LTRmNTEtYmZhNi04ZWYzZTZhOTgxYzIiLCJmdWxsX25hbWUiOiJRYXPEsW1vdiBPeMSfYXIgxZ9saSBvxJ9sdSIsInJvbGUiOiJBRE1JTiIsInBob25lIjoiKzk5NDUwMTIzNDU2NyIsImlhdCI6MTc5NTM3MjgwMCwiZXhwIjoxNzk1OTc3NjAwfQ.xyzSampleSignatureOxshar",
        "token_type": "Bearer",
        "expires_in": 604800,
        "admin": {
          "id": "c8b3f210-91a4-4f51-bfa6-8ef3e6a981c2",
          "full_name": "Qasımov Oxşar Əli oğlu",
          "role": "ADMIN",
          "phone": "+994501234567",
          "is_active": true
        }
      }
    }
    ```
  - **`400 Bad Request`:**
    ```json
    {
      "success": false,
      "message": "Telefon nömrəsi və şifrə daxil edilməlidir.",
      "error_code": "VALIDATION_ERROR",
      "details": {
        "phone": "Telefon nömrəsi düzgün formatda deyil."
      }
    }
    ```
  - **`401 Unauthorized`:**
    ```json
    {
      "success": false,
      "message": "Telefon nömrəsi və ya şifrə yanlışdır.",
      "error_code": "INVALID_CREDENTIALS",
      "details": null
    }
    ```
  - **`403 Forbidden`:**
    ```json
    {
      "success": false,
      "message": "Bu hesabla Müdür Panelinə daxil olmaq hüququnuz yoxdur.",
      "error_code": "ACCESS_DENIED",
      "details": null
    }
    ```

---

### 3.2. Cari Müdür Profilini Yoxlamaq (Me)
- **Təyinat:** Frontend səhifəni yeniləyərkən (F5) mövcud JWT tokenin etibarlılığını və cari müdir profilini əldə etmək.
- **HTTP Metodu və URL:** `GET /api/admin/me`
- **Headers:**
  ```http
  Authorization: Bearer <access_token>
  ```
- **Query / URL Params:** Yoxdur.
- **Request Body:** Yoxdur.
- **Response:**
  - **`200 OK` (Uğurlu):**
    ```json
    {
      "success": true,
      "message": "Profil məlumatları təqdim edildi.",
      "data": {
        "id": "c8b3f210-91a4-4f51-bfa6-8ef3e6a981c2",
        "full_name": "Qasımov Oxşar Əli oğlu",
        "role": "ADMIN",
        "phone": "+994501234567",
        "is_active": true,
        "company": {
          "name": "Oxşar İnşaat",
          "field": "Hidroizolyasiya və Dam Örtükləri",
          "timezone": "Asia/Baku"
        }
      }
    }
    ```
  - **`401 Unauthorized`:**
    ```json
    {
      "success": false,
      "message": "Sessiya müddəti bitib və ya token etibarsızdır. Zəhmət olmasa yenidən daxil olun.",
      "error_code": "TOKEN_EXPIRED",
      "details": null
    }
    ```

---

## 4. MODUL 2: Layihələr və Təklif İdarəetməsi (Projects & Proposals)

### 4.1. Bütün Layihələrin Siyahısı
- **Təyinat:** Bütün layihələrin status, axtarış və səhifələmə ilə siyahılanması. Hər kartda tamamlanma faizi, ümumi məbləğ, material və işçilik xərci və təxmini mənfəət qaytarılır.
- **HTTP Metodu və URL:** `GET /api/admin/projects`
- **Headers:** `Authorization: Bearer <access_token>`
- **Query Params:**
  - `status` *(string, optional)*: Layihə statusu üzrə filtr: `GOZLEMEDE`, `AKTIV`, `DAYANDIRILIB`, `TAMAMLANDI`, `PASSIV`.
  - `search` *(string, optional)*: Obyekt adı, ünvan və ya müştəri adı/telefonu üzrə axtarış (məs: `Badamdar` və ya `Rüstəm`).
  - `page` *(integer, optional, default: 1)*: Səhifə nömrəsi.
  - `limit` *(integer, optional, default: 20)*: Hər səhifədəki element sayı.
- **Request Body:** Yoxdur.
- **Response:**
  - **`200 OK` (Uğurlu):**
    ```json
    {
      "success": true,
      "message": "Layihələrin siyahısı təqdim edildi.",
      "data": {
        "projects": [
          {
            "id": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
            "name": "Badamdar Villa",
            "address": "Bakı şəhəri, Səbail rayonu, Badamdar qəs. 3-cü massiv ev 14",
            "client_name": "Rüstəm Şirinov",
            "client_phone": "+994503332211",
            "magic_token": "ox-9k2m8a1b3c",
            "status": "AKTIV",
            "pause_reason": null,
            "supply_type": "MATERIALLI",
            "material_brand": "TechnoNICOL Premium",
            "price_per_m2": 50.00,
            "total_target_m2": 1800.00,
            "total_completed_m2": 450.00,
            "progress_percent": 25.0,
            "total_amount": 90000.00,
            "financial_summary": {
              "total_revenue": 90000.00,
              "total_material_cost": 21450.00,
              "total_labor_cost": 4800.00,
              "total_cost": 26250.00,
              "estimated_profit": 63750.00,
              "profit_margin_percent": 70.83
            },
            "warranty_years": 5,
            "stages_count": 3,
            "active_workers_count": 3,
            "completed_at": null,
            "created_at": "2026-11-10T09:30:00+04:00"
          }
        ],
        "pagination": {
          "total_items": 12,
          "total_pages": 1,
          "current_page": 1,
          "limit": 20
        }
      }
    }
    ```
  - **`401 Unauthorized`:**
    ```json
    {
      "success": false,
      "message": "Token etibarsızdır.",
      "error_code": "UNAUTHORIZED",
      "details": null
    }
    ```

---

### 4.2. Tək Layihənin Tam Detalları
- **Təyinat:** Obyekt kartının tam profili: bütün mərhələlər, göndərilmiş materiallar, gündəlik usta foto/video hesabatları və maliyyə balansı.
- **HTTP Metodu və URL:** `GET /api/admin/projects/:id`
- **Headers:** `Authorization: Bearer <access_token>`
- **URL Params:**
  - `id` *(string/uuid, required)*: Layihənin identifikatoru.
- **Request Body:** Yoxdur.
- **Response:**
  - **`200 OK` (Uğurlu):**
    ```json
    {
      "success": true,
      "message": "Layihə detalları uğurla əldə olundu.",
      "data": {
        "id": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
        "name": "Badamdar Villa",
        "address": "Bakı şəhəri, Səbail rayonu, Badamdar qəs. 3-cü massiv ev 14",
        "client_name": "Rüstəm Şirinov",
        "client_phone": "+994503332211",
        "magic_token": "ox-9k2m8a1b3c",
        "magic_link_url": "https://oxsarinsaat.az/p/ox-9k2m8a1b3c",
        "status": "AKTIV",
        "pause_reason": null,
        "supply_type": "MATERIALLI",
        "material_brand": "TechnoNICOL Premium",
        "price_per_m2": 50.00,
        "total_amount": 90000.00,
        "warranty_years": 5,
        "otp_code": "8492",
        "completed_at": null,
        "created_at": "2026-11-10T09:30:00+04:00",
        "progress": {
          "total_target_m2": 1800.00,
          "total_completed_m2": 450.00,
          "percentage": 25.0,
          "estimated_days_total": 8.0,
          "worked_days_so_far": 2
        },
        "financials": {
          "agreed_amount": 90000.00,
          "materials_cost": 21450.00,
          "labor_cost": 4800.00,
          "net_profit": 63750.00,
          "profit_margin_percent": 70.83
        },
        "stages": [
          {
            "id": "stage-01",
            "work_type_id": "wt-astar-01",
            "work_type_name": "Astar və Təmizlik",
            "stage_name": "Mərhələ 1: Astar və səthin təmizlənməsi",
            "target_m2": 600.00,
            "completed_m2": 600.00,
            "progress_percent": 100.0,
            "is_completed": true
          },
          {
            "id": "stage-02",
            "work_type_id": "wt-surme-02",
            "work_type_name": "Sürmə İzolyasiya",
            "stage_name": "Mərhələ 2: Sürmə izolyasiya 1-ci və 2-ci qat",
            "target_m2": 600.00,
            "completed_m2": 450.00,
            "progress_percent": 75.0,
            "is_completed": false
          },
          {
            "id": "stage-03",
            "work_type_id": "wt-tol-03",
            "work_type_name": "Tol Yapışdırılması",
            "stage_name": "Mərhələ 3: Tol qatı və tikişlərin lehimlənməsi",
            "target_m2": 600.00,
            "completed_m2": 0.00,
            "progress_percent": 0.0,
            "is_completed": false
          }
        ],
        "materials": [
          {
            "id": "mat-01",
            "item_name": "Bitum Praymer (Astar) 20L",
            "quantity": 15.00,
            "unit_cost": 45.00,
            "total_cost": 675.00,
            "added_at": "2026-11-10T10:15:00+04:00"
          },
          {
            "id": "mat-02",
            "item_name": "Sürmə Mastika TechnoNICOL No.21 (20 kq)",
            "quantity": 30.00,
            "unit_cost": 65.00,
            "total_cost": 1950.00,
            "added_at": "2026-11-12T11:00:00+04:00"
          }
        ],
        "daily_logs": [
          {
            "id": "log-01",
            "work_date": "2026-11-18",
            "stage_id": "stage-02",
            "stage_name": "Mərhələ 2: Sürmə izolyasiya 1-ci və 2-ci qat",
            "usta": {
              "id": "usta-01",
              "full_name": "Rüstəm Usta Qəzənfər oğlu",
              "phone": "+994507776655"
            },
            "helpers": [
              {
                "id": "fehle-01",
                "full_name": "Əli Həsənov",
                "phone": "+994518889900"
              }
            ],
            "morning_time": "08:45:12",
            "morning_media_url": "https://storage.oxsarinsaat.az/logs/badamdar_20261118_morning.jpg",
            "evening_time": "18:15:40",
            "evening_media_url": "https://storage.oxsarinsaat.az/logs/badamdar_20261118_evening.jpg",
            "done_m2": 300.00,
            "material_note": "6 vedrə sürmə mastika sərf olundu, səth tam qurudu.",
            "is_below_norm": false,
            "status": "CLOSED"
          }
        ]
      }
    }
    ```
  - **`404 Not Found`:**
    ```json
    {
      "success": false,
      "message": "Axtarılan layihə tapılmadı.",
      "error_code": "PROJECT_NOT_FOUND",
      "details": null
    }
    ```

---

### 4.3. Yeni Təklif / Layihə Yaratmaq (Create Project)
- **Təyinat:** Müdür tərəfindən yeni təklif/layihə daxil edilməsi. Server daxil edilən mərhələlərin cəminə əsasən ümumi m²-i, standart iş normalarına görə təxmini iş günlərini, ümumi məbləği hesablayır və avtomatik 12 simvollu unikal `magic_token` (müştəri izləmə linki üçün) generasiya edir.
- **HTTP Metodu və URL:** `POST /api/admin/projects`
- **Headers:**
  ```http
  Authorization: Bearer <access_token>
  Content-Type: application/json
  ```
- **Query / URL Params:** Yoxdur.
- **Request Body:**
  ```json
  {
    "name": "Badamdar Villa",
    "address": "Bakı şəhəri, Səbail rayonu, Badamdar qəs. 3-cü massiv ev 14",
    "client_name": "Rüstəm Şirinov",
    "client_phone": "+994503332211",
    "supply_type": "MATERIALLI",
    "material_brand": "TechnoNICOL Premium",
    "price_per_m2": 50.00,
    "warranty_years": 5,
    "stages": [
      {
        "work_type_id": "wt-astar-01",
        "stage_name": "Mərhələ 1: Astar və təmizlik",
        "target_m2": 600.00
      },
      {
        "work_type_id": "wt-surme-02",
        "stage_name": "Mərhələ 2: Sürmə izolyasiya 1-ci qat",
        "target_m2": 600.00
      },
      {
        "work_type_id": "wt-tol-03",
        "stage_name": "Mərhələ 3: Tol yapışdırılması",
        "target_m2": 600.00
      }
    ]
  }
  ```
  - `name` *(string, required)*: Obyektin fərqləndirici adı.
  - `address` *(string, required)*: Obyektin dəqiq ünvanı.
  - `client_name` *(string, required)*: Sifarişçinin adı və soyadı.
  - `client_phone` *(string, required)*: Sifarişçinin WhatsApp nömrəsi.
  - `supply_type` *(string, required, enum: `MATERIALLI`, `ISCILIK`)*: Təchizat növü.
  - `material_brand` *(string, optional)*: Əgər `MATERIALLI` seçilərsə brend adı (məs: `TechnoNICOL`).
  - `price_per_m2` *(number, required)*: 1 m² satış qiyməti (AZN).
  - `warranty_years` *(integer, required)*: Verilən rəsmi zəmanət ili (məs: 5).
  - `stages` *(array of objects, required, min items: 1)*:
    - `work_type_id` *(string/uuid, required)*: Mövcud iş növünün ID-si.
    - `stage_name` *(string, required)*: Mərhələnin xüsusi adı.
    - `target_m2` *(number, required, positive)*: Həmin mərhələ üzrə hədəf kvadratmetr.

- **Response:**
  - **`201 Created` (Uğurlu):**
    ```json
    {
      "success": true,
      "message": "Yeni layihə və təklif sənədi uğurla yaradıldı.",
      "data": {
        "id": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
        "name": "Badamdar Villa",
        "address": "Bakı şəhəri, Səbail rayonu, Badamdar qəs. 3-cü massiv ev 14",
        "client_name": "Rüstəm Şirinov",
        "client_phone": "+994503332211",
        "magic_token": "ox-9k2m8a1b3c",
        "magic_link_url": "https://oxsarinsaat.az/p/ox-9k2m8a1b3c",
        "status": "GOZLEMEDE",
        "supply_type": "MATERIALLI",
        "material_brand": "TechnoNICOL Premium",
        "price_per_m2": 50.00,
        "total_amount": 90000.00,
        "calculated_total_m2": 1800.00,
        "estimated_working_days": 8.0,
        "warranty_years": 5,
        "otp_code": "8492",
        "stages": [
          {
            "id": "stage-01",
            "work_type_id": "wt-astar-01",
            "stage_name": "Mərhələ 1: Astar və təmizlik",
            "target_m2": 600.00,
            "completed_m2": 0.00
          },
          {
            "id": "stage-02",
            "work_type_id": "wt-surme-02",
            "stage_name": "Mərhələ 2: Sürmə izolyasiya 1-ci qat",
            "target_m2": 600.00,
            "completed_m2": 0.00
          },
          {
            "id": "stage-03",
            "work_type_id": "wt-tol-03",
            "stage_name": "Mərhələ 3: Tol yapışdırılması",
            "target_m2": 600.00,
            "completed_m2": 0.00
          }
        ],
        "created_at": "2026-11-22T22:45:00+04:00"
      }
    }
    ```
  - **`400 Bad Request`:**
    ```json
    {
      "success": false,
      "message": "Layihə məlumatları natamamdır.",
      "error_code": "VALIDATION_FAILED",
      "details": {
        "stages": "Ən azı 1 mərhələ təyin olunmalıdır.",
        "price_per_m2": "1 m² qiyməti müsbət ədəd olmalıdır."
      }
    }
    ```

---

### 4.4. Layihəni Redaktə Etmək (Update Project)
- **Təyinat:** Mövcud layihənin parametrlərini (ad, müştəri əlaqə vasitələri, zəmanət ili, qiymət) redaktə etmək.
- **HTTP Metodu və URL:** `PUT /api/admin/projects/:id`
- **Headers:**
  ```http
  Authorization: Bearer <access_token>
  Content-Type: application/json
  ```
- **URL Params:** `id` *(string/uuid, required)*
- **Request Body:**
  ```json
  {
    "name": "Badamdar Villa Rezidens",
    "address": "Bakı şəhəri, Səbail rayonu, Badamdar qəs. 3-cü massiv ev 14/2",
    "client_name": "Rüstəm Şirinov",
    "client_phone": "+994503332211",
    "supply_type": "MATERIALLI",
    "material_brand": "TechnoNICOL Ultra",
    "price_per_m2": 52.00,
    "warranty_years": 7
  }
  ```
  - Bütün sahələr məcburidir (dəyişdirilməyən sahələr cari qiyməti ilə göndərilir).
- **Response:**
  - **`200 OK` (Uğurlu):**
    ```json
    {
      "success": true,
      "message": "Layihə məlumatları uğurla yeniləndi.",
      "data": {
        "id": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
        "name": "Badamdar Villa Rezidens",
        "address": "Bakı şəhəri, Səbail rayonu, Badamdar qəs. 3-cü massiv ev 14/2",
        "price_per_m2": 52.00,
        "total_amount": 93600.00,
        "warranty_years": 7,
        "updated_at": "2026-11-22T23:00:00+04:00"
      }
    }
    ```
  - **`404 Not Found`:**
    ```json
    {
      "success": false,
      "message": "Yenilənmək istənən layihə tapılmadı.",
      "error_code": "NOT_FOUND",
      "details": null
    }
    ```

---

### 4.5. Layihə Statusunu Dəyişmək (Change Project Status)
- **Təyinat:** Layihə statusunu addım-addım dəyişmək (`GOZLEMEDE`, `AKTIV`, `DAYANDIRILIB`, `TAMAMLANDI`, `PASSIV`).
- **Kritik Biznes Qaydası:** Əgər status `DAYANDIRILIB` edilirsə, `pause_reason` sahəsi **mütləq** doldurulmalıdır (məsələn: hava şəraiti, yağış, beton quruması). Əgər status `AKTIV` edilirsə, layihə avtomatik ustaların mobil ekranına düşür.
- **HTTP Metodu və URL:** `PATCH /api/admin/projects/:id/status`
- **Headers:**
  ```http
  Authorization: Bearer <access_token>
  Content-Type: application/json
  ```
- **URL Params:** `id` *(string/uuid, required)*
- **Request Body:**
  ```json
  {
    "status": "DAYANDIRILIB",
    "pause_reason": "Güclü yağış səbəbindən dam örtüyünün quruması gözlənilir."
  }
  ```
  - `status` *(string, required, enum: `GOZLEMEDE`, `AKTIV`, `DAYANDIRILIB`, `TAMAMLANDI`, `PASSIV`)*
  - `pause_reason` *(string, conditional)*: Status `DAYANDIRILIB` olduqda **məcburidir**, digər hallarda `null` göndərilə bilər.

- **Response:**
  - **`200 OK` (Uğurlu):**
    ```json
    {
      "success": true,
      "message": "Layihə statusu uğurla dəyişdirildi.",
      "data": {
        "id": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
        "name": "Badamdar Villa",
        "status": "DAYANDIRILIB",
        "pause_reason": "Güclü yağış səbəbindən dam örtüyünün quruması gözlənilir.",
        "updated_at": "2026-11-22T23:05:00+04:00"
      }
    }
    ```
  - **`400 Bad Request`:**
    ```json
    {
      "success": false,
      "message": "Layihə müvəqqəti dayandırıldıqda mütləq səbəb qeyd olunmalıdır.",
      "error_code": "PAUSE_REASON_REQUIRED",
      "details": {
        "pause_reason": "Bu sahə boş buraxıla bilməz."
      }
    }
    ```

---

### 4.6. Layihəni Silmək və ya Arxivləmək (Delete/Archive Project)
- **Təyinat:** Layihəni sistemdən silmək. Əgər layihəyə aid usta loqları (`daily_logs`) və ya xərclənmiş materiallar (`project_materials`) varsa, məlumat bazasının tamlığını və maliyyə tarixçəsini qorumaq üçün layihə fiziki silinmir, statusu avtomatik `PASSIV` (arxiv) edilir. Heç bir hərəkət olmayan təkliflər isə bazadan tam silinir.
- **HTTP Metodu və URL:** `DELETE /api/admin/projects/:id`
- **Headers:** `Authorization: Bearer <access_token>`
- **URL Params:** `id` *(string/uuid, required)*
- **Request Body:** Yoxdur.
- **Response:**
  - **`200 OK` (Tam Silindikdə):**
    ```json
    {
      "success": true,
      "message": "Layihə bazadan uğurla silindi.",
      "data": {
        "id": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
        "deleted": true
      }
    }
    ```
  - **`200 OK` (Tarixçəsi olduğu üçün Arxivləndikdə):**
    ```json
    {
      "success": true,
      "message": "Layihəyə bağlı iş loqları və ya materiallar olduğu üçün silinmədi, status 'PASSIV' olaraq arxivləşdirildi.",
      "data": {
        "id": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
        "deleted": false,
        "archived": true,
        "status": "PASSIV"
      }
    }
    ```

---

## 5. MODUL 3: İşçilər, Avans və Maaş Hesablaşması (Workers, Advances & Payroll)

### 5.1. İşçilərin Siyahısı və Canlı Balansı
- **Təyinat:** Bütün işçilərin (Usta və Fəhlə) siyahısı və son maaş bağlanışından bu günə qədər olan canlı balansı: işlənmiş gün sayı, hesablanmış ümumi maaş (`gross_salary`), götürülmüş avansların cəmi (`total_advances`) və qalıq ödəniləcək xalis məbləğ (`net_balance`).
- **HTTP Metodu və URL:** `GET /api/admin/workers`
- **Headers:** `Authorization: Bearer <access_token>`
- **Query Params:**
  - `role` *(string, optional)*: `USTA` və ya `FEHLE` filtr.
  - `is_active` *(boolean, optional)*: `true` və ya `false`.
- **Request Body:** Yoxdur.
- **Response:**
  - **`200 OK` (Uğurlu):**
    ```json
    {
      "success": true,
      "message": "İşçi siyahısı və cari balanslar uğurla gətirildi.",
      "data": [
        {
          "id": "w-01-usta-rustem",
          "full_name": "Şirinov Rüstəm Qəzənfər oğlu",
          "role": "USTA",
          "phone": "+994507776655",
          "daily_wage": 50.00,
          "is_active": true,
          "current_period": {
            "period_start": "2026-11-01",
            "worked_days": 14,
            "gross_salary": 700.00,
            "total_advances": 240.00,
            "net_balance": 460.00,
            "last_worked_date": "2026-11-21"
          }
        },
        {
          "id": "w-02-fehle-eli",
          "full_name": "Həsənov Əli Kamran oğlu",
          "role": "FEHLE",
          "phone": "+994518889900",
          "daily_wage": 30.00,
          "is_active": true,
          "current_period": {
            "period_start": "2026-11-01",
            "worked_days": 12,
            "gross_salary": 360.00,
            "total_advances": 100.00,
            "net_balance": 260.00,
            "last_worked_date": "2026-11-20"
          }
        }
      ]
    }
    ```

---

### 5.2. Yeni İşçi (Usta və ya Fəhlə) Yaratmaq
- **Təyinat:** Şirkətə yeni usta və ya fəhlə əlavə etmək.
- **Biznes Qaydası:**
  - Əgər rol `USTA` seçilirsə, sahədə sürətli giriş üçün **4 rəqəmli PIN kod** məcburidir və server tərəfindən bcrypt ilə hash-lənir (`pin_hash`).
  - Əgər rol `FEHLE` seçilirsə, fəhlələr mobil sistemə daxil olmadığından PIN kod tələb olunmur (`pin: null`).
- **HTTP Metodu və URL:** `POST /api/admin/workers`
- **Headers:**
  ```http
  Authorization: Bearer <access_token>
  Content-Type: application/json
  ```
- **Request Body (Usta üçün nümunə):**
  ```json
  {
    "full_name": "Şirinov Rüstəm Qəzənfər oğlu",
    "role": "USTA",
    "phone": "+994507776655",
    "daily_wage": 50.00,
    "pin": "4821"
  }
  ```
- **Request Body (Fəhlə üçün nümunə):**
  ```json
  {
    "full_name": "Həsənov Əli Kamran oğlu",
    "role": "FEHLE",
    "phone": "+994518889900",
    "daily_wage": 30.00
  }
  ```
  - `full_name` *(string, required)*: Ad, Soyad, Ata adı.
  - `role` *(string, required, enum: `USTA`, `FEHLE`)*: İşçi statusu.
  - `phone` *(string, required)*: Əlaqə nömrəsi.
  - `daily_wage` *(number, required)*: Standart günlük əmək haqqı (AZN).
  - `pin` *(string, conditional)*: `role === 'USTA'` olduqda dəqiq 4 rəqəmli string məcburidir (məs: `"4821"`).

- **Response:**
  - **`201 Created` (Uğurlu):**
    ```json
    {
      "success": true,
      "message": "Yeni işçi uğurla qeydiyyata alındı.",
      "data": {
        "id": "w-01-usta-rustem",
        "full_name": "Şirinov Rüstəm Qəzənfər oğlu",
        "role": "USTA",
        "phone": "+994507776655",
        "daily_wage": 50.00,
        "is_active": true,
        "created_at": "2026-11-22T23:10:00+04:00"
      }
    }
    ```
  - **`400 Bad Request`:**
    ```json
    {
      "success": false,
      "message": "Usta üçün 4 rəqəmli PIN kod mütləq daxil edilməlidir.",
      "error_code": "PIN_REQUIRED",
      "details": {
        "pin": "PIN kod dəqiq 4 rəqəmdən ibarət olmalıdır."
      }
    }
    ```
  - **`409 Conflict`:**
    ```json
    {
      "success": false,
      "message": "Bu telefon nömrəsi ilə artıq qeydiyyatdan keçmiş işçi mövcuddur.",
      "error_code": "PHONE_ALREADY_EXISTS",
      "details": null
    }
    ```

---

### 5.3. İşçi Məlumatlarını Yeniləmək
- **Təyinat:** İşçinin adını, telefonunu, günlük maaşını redaktə etmək və ya ustanın PIN kodunu dəyişmək.
- **HTTP Metodu və URL:** `PUT /api/admin/workers/:id`
- **Headers:**
  ```http
  Authorization: Bearer <access_token>
  Content-Type: application/json
  ```
- **URL Params:** `id` *(string/uuid, required)*
- **Request Body:**
  ```json
  {
    "full_name": "Şirinov Rüstəm Qəzənfər oğlu",
    "phone": "+994507776655",
    "daily_wage": 55.00,
    "pin": "9921"
  }
  ```
  - `pin` *(string, optional)*: Əgər dəyişdirilmirsə boş və ya `null` göndərilə bilər.
- **Response:**
  - **`200 OK` (Uğurlu):**
    ```json
    {
      "success": true,
      "message": "İşçi məlumatları uğurla yeniləndi.",
      "data": {
        "id": "w-01-usta-rustem",
        "full_name": "Şirinov Rüstəm Qəzənfər oğlu",
        "role": "USTA",
        "phone": "+994507776655",
        "daily_wage": 55.00,
        "is_active": true,
        "updated_at": "2026-11-22T23:15:00+04:00"
      }
    }
    ```

---

### 5.4. İşçini Deaktiv / Aktiv Etmək (Toggle Active)
- **Təyinat:** İşdən çıxan və ya müvəqqəti işləməyən ustanı/fəhləni deaktiv etmək (deaktiv usta mobil ekrana daxil ola bilməz).
- **HTTP Metodu və URL:** `PATCH /api/admin/workers/:id/toggle-active`
- **Headers:** `Authorization: Bearer <access_token>`
- **URL Params:** `id` *(string/uuid, required)*
- **Request Body:** Yoxdur.
- **Response:**
  - **`200 OK` (Uğurlu):**
    ```json
    {
      "success": true,
      "message": "İşçinin statusu uğurla dəyişdirildi.",
      "data": {
        "id": "w-01-usta-rustem",
        "full_name": "Şirinov Rüstəm Qəzənfər oğlu",
        "is_active": false,
        "updated_at": "2026-11-22T23:18:00+04:00"
      }
    }
    ```

---

### 5.5. Sürətli "+ Avans Ver" Əməliyyatı (Create Advance)
- **Təyinat:** Müdürün gün ərzində işçiyə verdiyi əlbəəl cib xərcliyini (məsələn: 20–25 AZN kömək pulu) dərhal qeyd etməsi. Sistem bunu avtomatik həmin işçinin cari balansından çıxır.
- **HTTP Metodu və URL:** `POST /api/admin/advances`
- **Headers:**
  ```http
  Authorization: Bearer <access_token>
  Content-Type: application/json
  ```
- **Request Body:**
  ```json
  {
    "worker_id": "w-01-usta-rustem",
    "amount": 25.00,
    "given_date": "2026-11-22",
    "note": "Badamdar villa obyektində günorta yeməyi və yol xərci üçün verildi."
  }
  ```
  - `worker_id` *(string/uuid, required)*: Avans alan ustanın və ya fəhlənin ID-si.
  - `amount` *(number, required, positive)*: Avans məbləği (AZN).
  - `given_date` *(string, required, format: `YYYY-MM-DD`)*: Verildiyi tarix.
  - `note` *(string, optional)*: Xüsusi qeyd.

- **Response:**
  - **`201 Created` (Uğurlu):**
    ```json
    {
      "success": true,
      "message": "25.00 AZN avans uğurla qeydə alındı və işçinin balansından çıxıldı.",
      "data": {
        "id": "adv-9912",
        "worker_id": "w-01-usta-rustem",
        "worker_name": "Şirinov Rüstəm Qəzənfər oğlu",
        "amount": 25.00,
        "given_date": "2026-11-22",
        "note": "Badamdar villa obyektində günorta yeməyi və yol xərci üçün verildi.",
        "created_by": "c8b3f210-91a4-4f51-bfa6-8ef3e6a981c2",
        "updated_worker_balance": {
          "total_advances": 265.00,
          "net_balance": 435.00
        },
        "created_at": "2026-11-22T23:20:00+04:00"
      }
    }
    ```
  - **`400 Bad Request`:**
    ```json
    {
      "success": false,
      "message": "Avans məbləği sıfırdan böyük olmalıdır.",
      "error_code": "INVALID_AMOUNT",
      "details": null
    }
    ```

---

### 5.6. İşçinin Avans Tarixçəsi (Worker Advances History)
- **Təyinat:** Seçilmiş işçinin indiyə qədər aldığı bütün avans qeydlərinin siyahısı.
- **HTTP Metodu və URL:** `GET /api/admin/workers/:id/advances`
- **Headers:** `Authorization: Bearer <access_token>`
- **URL Params:** `id` *(string/uuid, required)*
- **Query Params:**
  - `from_date` *(string, optional, `YYYY-MM-DD`)*
  - `to_date` *(string, optional, `YYYY-MM-DD`)*
- **Request Body:** Yoxdur.
- **Response:**
  - **`200 OK` (Uğurlu):**
    ```json
    {
      "success": true,
      "message": "İşçinin avans tarixçəsi gətirildi.",
      "data": {
        "worker": {
          "id": "w-01-usta-rustem",
          "full_name": "Şirinov Rüstəm Qəzənfər oğlu",
          "role": "USTA"
        },
        "total_advances_sum": 265.00,
        "advances": [
          {
            "id": "adv-9912",
            "amount": 25.00,
            "given_date": "2026-11-22",
            "note": "Badamdar villa obyektində günorta yeməyi və yol xərci üçün verildi.",
            "created_by_name": "Qasımov Oxşar (Müdir)",
            "created_at": "2026-11-22T23:20:00+04:00"
          },
          {
            "id": "adv-8810",
            "amount": 20.00,
            "given_date": "2026-11-18",
            "note": "Kömək pulu",
            "created_by_name": "Qasımov Oxşar (Müdir)",
            "created_at": "2026-11-18T13:40:00+04:00"
          }
        ]
      }
    }
    ```

---

### 5.7. Maaş Ödənişi və Dövrü Bağlama (Settle Worker Payroll)
- **Təyinat:** Həftə və ya ay sonunda müdir işçiyə qalıq maaşını ödəyir və 'Ödənildi və Dövrü Bağla' əməliyyatını icra edir.
- **Daxili Server Məntiqi (Atomic Transaction):**
  1. Həmin işçinin son bağlanış tarixindən bu günə qədər olan `worked_days`, `gross_salary`, `total_advances` və `net_paid` məbləğini dondurur.
  2. Məlumatları `salary_settlements` cədvəlinə rəsmi qeyd kimi yazır.
  3. İşçinin cari avans və iş günü sayğacını sıfırlayaraq yeni hesabat dövrünü açır.
- **HTTP Metodu və URL:** `POST /api/admin/workers/:id/settle`
- **Headers:**
  ```http
  Authorization: Bearer <access_token>
  Content-Type: application/json
  ```
- **URL Params:** `id` *(string/uuid, required)*
- **Request Body:**
  ```json
  {
    "period_start": "2026-11-01",
    "period_end": "2026-11-22",
    "note": "Noyabr ayının 1-ci yarısı üzrə 14 günlük tam hesablaşma nağd ödənildi."
  }
  ```
  - `period_start` *(string, required, `YYYY-MM-DD`)*
  - `period_end` *(string, required, `YYYY-MM-DD`)*
  - `note` *(string, optional)*
- **Response:**
  - **`200 OK` (Uğurlu):**
    ```json
    {
      "success": true,
      "message": "Hesablaşma uğurla bağlandı və arxivə köçürüldü. Yeni dövr sıfır balansla açıldı.",
      "data": {
        "settlement_id": "settle-20261122-01",
        "worker_id": "w-01-usta-rustem",
        "worker_name": "Şirinov Rüstəm Qəzənfər oğlu",
        "period_start": "2026-11-01",
        "period_end": "2026-11-22",
        "worked_days": 14,
        "daily_wage": 50.00,
        "gross_salary": 700.00,
        "total_advances": 240.00,
        "net_paid": 460.00,
        "paid_at": "2026-11-22T23:25:00+04:00",
        "new_period_opened_at": "2026-11-23"
      }
    }
    ```
  - **`400 Bad Request`:**
    ```json
    {
      "success": false,
      "message": "Bu dövr üçün bağlanacaq işlənmiş gün və ya ödəniləcək məbləğ yoxdur.",
      "error_code": "NOTHING_TO_SETTLE",
      "details": null
    }
    ```

---

### 5.8. Keçmiş Maaş Ödənişləri Arxivi (Salary Settlements Archive)
- **Təyinat:** Bütün keçmiş dövrlər üzrə aparılmış maaş hesablaşmalarının arxiv tarixçəsi.
- **HTTP Metodu və URL:** `GET /api/admin/salary-settlements`
- **Headers:** `Authorization: Bearer <access_token>`
- **Query Params:**
  - `worker_id` *(string, optional)*: Müəyyən işçiyə görə filtr.
  - `month` *(string, optional, format: `YYYY-MM`, məs: `2026-11`)*.
- **Request Body:** Yoxdur.
- **Response:**
  - **`200 OK` (Uğurlu):**
    ```json
    {
      "success": true,
      "message": "Maaş hesablaşmaları arxivi gətirildi.",
      "data": [
        {
          "id": "settle-20261122-01",
          "worker_id": "w-01-usta-rustem",
          "worker_name": "Şirinov Rüstəm Qəzənfər oğlu",
          "worker_role": "USTA",
          "period_start": "2026-11-01",
          "period_end": "2026-11-22",
          "worked_days": 14,
          "gross_salary": 700.00,
          "total_advances": 240.00,
          "net_paid": 460.00,
          "paid_at": "2026-11-22T23:25:00+04:00"
        }
      ]
    }
    ```

---

## 6. MODUL 4: İş Növləri və Normativlər Kataloqu (Work Types)

### 6.1. İş Növlərinin Siyahısı
- **Təyinat:** Sistemdə mövcud olan bütün standart izolyasiya iş növləri, onların gündəlik m² icra normaları və standart m² qiymətləri.
- **HTTP Metodu və URL:** `GET /api/admin/work-types`
- **Headers:** `Authorization: Bearer <access_token>`
- **Query Params:** Yoxdur.
- **Request Body:** Yoxdur.
- **Response:**
  - **`200 OK` (Uğurlu):**
    ```json
    {
      "success": true,
      "message": "İş növləri və normativlər kataloqu təqdim edildi.",
      "data": [
        {
          "id": "wt-astar-01",
          "name": "Astar və Təmizlik",
          "daily_norm_m2": 600.00,
          "default_price_m2": 5.00,
          "created_at": "2026-11-01T10:00:00+04:00"
        },
        {
          "id": "wt-surme-02",
          "name": "Sürmə İzolyasiya",
          "daily_norm_m2": 500.00,
          "default_price_m2": 18.00,
          "created_at": "2026-11-01T10:00:00+04:00"
        },
        {
          "id": "wt-tol-03",
          "name": "Tol Yapışdırılması",
          "daily_norm_m2": 150.00,
          "default_price_m2": 25.00,
          "created_at": "2026-11-01T10:00:00+04:00"
        }
      ]
    }
    ```

---

### 6.2. Yeni İş Növü Əlavə Etmək
- **Təyinat:** Kataloqa yeni iş növü və gündəlik normativ əlavə etmək (məsələn: Membran izolyasiya).
- **HTTP Metodu və URL:** `POST /api/admin/work-types`
- **Headers:**
  ```http
  Authorization: Bearer <access_token>
  Content-Type: application/json
  ```
- **Request Body:**
  ```json
  {
    "name": "PVC Membran İzolyasiyası",
    "daily_norm_m2": 250.00,
    "default_price_m2": 32.00
  }
  ```
  - `name` *(string, required)*: İş növünün adı.
  - `daily_norm_m2` *(number, required, positive)*: 1 briqadanın 1 gündə icra etməli olduğu norma m².
  - `default_price_m2` *(number, required, positive)*: Standart təklif qiyməti (AZN/m²).

- **Response:**
  - **`201 Created` (Uğurlu):**
    ```json
    {
      "success": true,
      "message": "Yeni iş növü kataloqa əlavə edildi.",
      "data": {
        "id": "wt-pvc-04",
        "name": "PVC Membran İzolyasiyası",
        "daily_norm_m2": 250.00,
        "default_price_m2": 32.00,
        "created_at": "2026-11-22T23:30:00+04:00"
      }
    }
    ```

---

### 6.3. İş Növünü Yeniləmək
- **Təyinat:** Mövcud iş növünün normativini və ya qiymətini yeniləmək.
- **HTTP Metodu və URL:** `PUT /api/admin/work-types/:id`
- **Headers:**
  ```http
  Authorization: Bearer <access_token>
  Content-Type: application/json
  ```
- **URL Params:** `id` *(string/uuid, required)*
- **Request Body:**
  ```json
  {
    "name": "Tol Yapışdırılması (2 qat)",
    "daily_norm_m2": 140.00,
    "default_price_m2": 28.00
  }
  ```
- **Response:**
  - **`200 OK` (Uğurlu):**
    ```json
    {
      "success": true,
      "message": "İş növü normativi uğurla yeniləndi.",
      "data": {
        "id": "wt-tol-03",
        "name": "Tol Yapışdırılması (2 qat)",
        "daily_norm_m2": 140.00,
        "default_price_m2": 28.00,
        "updated_at": "2026-11-22T23:32:00+04:00"
      }
    }
    ```

---

## 7. MODUL 5: Obyekt Materialları və Maya Dəyəri (Project Materials)

### 7.1. Obyektə Göndərilən Materialların Siyahısı
- **Təyinat:** Tək bir obyekt üçün alınmış və ya göndərilmiş bütün materialların, onların vahid qiymətinin və cəm maya dəyərinin siyahısı.
- **HTTP Metodu və URL:** `GET /api/admin/projects/:projectId/materials`
- **Headers:** `Authorization: Bearer <access_token>`
- **URL Params:** `projectId` *(string/uuid, required)*
- **Request Body:** Yoxdur.
- **Response:**
  - **`200 OK` (Uğurlu):**
    ```json
    {
      "success": true,
      "message": "Obyektin material xərcləri siyahısı gətirildi.",
      "data": {
        "project_id": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
        "project_name": "Badamdar Villa",
        "total_material_cost_sum": 21450.00,
        "materials": [
          {
            "id": "mat-01",
            "item_name": "Bitum Praymer (Astar) 20L",
            "quantity": 15.00,
            "unit_cost": 45.00,
            "total_cost": 675.00,
            "added_at": "2026-11-10T10:15:00+04:00"
          },
          {
            "id": "mat-02",
            "item_name": "Sürmə Mastika TechnoNICOL No.21 (20 kq)",
            "quantity": 30.00,
            "unit_cost": 65.00,
            "total_cost": 1950.00,
            "added_at": "2026-11-12T11:00:00+04:00"
          },
          {
            "id": "mat-03",
            "item_name": "Texnoelast EPP Tol (Rulon 10m²)",
            "quantity": 190.00,
            "unit_cost": 99.00,
            "total_cost": 18810.00,
            "added_at": "2026-11-15T09:30:00+04:00"
          },
          {
            "id": "mat-04",
            "item_name": "Qaz balonu (propan lehimləmə üçün)",
            "quantity": 2.00,
            "unit_cost": 7.50,
            "total_cost": 15.00,
            "added_at": "2026-11-15T09:35:00+04:00"
          }
        ]
      }
    }
    ```

---

### 7.2. Yeni Material Xərci Əlavə Etmək
- **Təyinat:** Müdir obyektə göndərdiyi materialı (sayı və alış qiyməti ilə) sistemə qeyd edir. Server avtomatik `total_cost = quantity * unit_cost` hesablayır və layihənin maliyyə balansını yeniləyir.
- **HTTP Metodu və URL:** `POST /api/admin/projects/:projectId/materials`
- **Headers:**
  ```http
  Authorization: Bearer <access_token>
  Content-Type: application/json
  ```
- **URL Params:** `projectId` *(string/uuid, required)*
- **Request Body:**
  ```json
  {
    "item_name": "Texnoelast EPP Tol (Rulon 10m²)",
    "quantity": 190.00,
    "unit_cost": 99.00
  }
  ```
  - `item_name` *(string, required)*: Materialın adı və qablaşdırma növü.
  - `quantity` *(number, required, positive)*: Miqdarı (ədəd, vedrə, rulon və s.).
  - `unit_cost` *(number, required, positive)*: 1 vahidin alış qiyməti (AZN).

- **Response:**
  - **`201 Created` (Uğurlu):**
    ```json
    {
      "success": true,
      "message": "Material xərci layihə kartına uğurla əlavə olundu.",
      "data": {
        "id": "mat-03",
        "project_id": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
        "item_name": "Texnoelast EPP Tol (Rulon 10m²)",
        "quantity": 190.00,
        "unit_cost": 99.00,
        "total_cost": 18810.00,
        "added_at": "2026-11-22T23:35:00+04:00",
        "new_project_material_total": 21450.00
      }
    }
    ```
  - **`400 Bad Request`:**
    ```json
    {
      "success": false,
      "message": "Miqdar və vahid qiymət müsbət ədəd olmalıdır.",
      "error_code": "INVALID_MATERIAL_DATA",
      "details": null
    }
    ```

---

### 7.3. Material Qeydini Silmək
- **Təyinat:** Səhv daxil edilmiş material qeydinin silinməsi. Silinmə avtomatik layihənin xərc balansını azaldır və audit jurnalına yazılır.
- **HTTP Metodu və URL:** `DELETE /api/admin/materials/:id`
- **Headers:** `Authorization: Bearer <access_token>`
- **URL Params:** `id` *(string/uuid, required)*: Silinəcək material qeydinin ID-si.
- **Request Body:** Yoxdur.
- **Response:**
  - **`200 OK` (Uğurlu):**
    ```json
    {
      "success": true,
      "message": "Material qeydi uğurla silindi və layihə maya dəyəri yenidən hesablandı.",
      "data": {
        "id": "mat-04",
        "deleted": true
      }
    }
    ```
  - **`404 Not Found`:**
    ```json
    {
      "success": false,
      "message": "Silinəcək material qeydi tapılmadı.",
      "error_code": "MATERIAL_NOT_FOUND",
      "details": null
    }
    ```

---

## 8. MODUL 6: Mənfəət Analitikası və Audit (Analytics & Audit Logs)

### 8.1. Ümumi Dashboard Statistikası (Executive Summary)
- **Təyinat:** Müdürün sistemə daxil olduqda gördüyü əsas idarəetmə göstəriciləri: aktiv obyektlərin sayı, dövriyyə, xərclər, xalis qazanc və layihələrin müqayisəli rentabellik cədvəli.
- **HTTP Metodu və URL:** `GET /api/admin/analytics/summary`
- **Headers:** `Authorization: Bearer <access_token>`
- **Query Params:**
  - `start_date` *(string, optional, `YYYY-MM-DD`)*
  - `end_date` *(string, optional, `YYYY-MM-DD`)*
- **Request Body:** Yoxdur.
- **Response:**
  - **`200 OK` (Uğurlu):**
    ```json
    {
      "success": true,
      "message": "İdarəetmə və mənfəət statistikası təqdim edildi.",
      "data": {
        "kpis": {
          "active_projects_count": 4,
          "pending_proposals_count": 3,
          "paused_projects_count": 1,
          "completed_projects_count": 18,
          "total_active_workers": 9,
          "total_revenue": 145000.00,
          "total_material_cost": 38200.00,
          "total_labor_cost": 16400.00,
          "total_expenses": 54600.00,
          "net_profit": 90400.00,
          "average_profit_margin_percent": 62.34
        },
        "projects_comparison": [
          {
            "project_id": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
            "name": "Badamdar Villa",
            "status": "AKTIV",
            "total_amount": 90000.00,
            "material_cost": 21450.00,
            "labor_cost": 4800.00,
            "net_profit": 63750.00,
            "profit_margin_percent": 70.83,
            "progress_percent": 25.0
          },
          {
            "project_id": "b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e",
            "name": "Mərdəkan Bağ Evi",
            "status": "AKTIV",
            "total_amount": 35000.00,
            "material_cost": 11200.00,
            "labor_cost": 5100.00,
            "net_profit": 18700.00,
            "profit_margin_percent": 53.43,
            "progress_percent": 60.0
          },
          {
            "project_id": "c3d4e5f6-a7b8-9c0d-1e2f-3a4b5c6d7e8f",
            "name": "Şüvəlan İstehsalat Anbarı",
            "status": "DAYANDIRILIB",
            "total_amount": 20000.00,
            "material_cost": 5550.00,
            "labor_cost": 6500.00,
            "net_profit": 7950.00,
            "profit_margin_percent": 39.75,
            "progress_percent": 40.0
          }
        ]
      }
    }
    ```

---

### 8.2. Audit Qeydləri və Log Jurnalı (Audit Logs)
- **Təyinat:** Sistemdə baş verən bütün təhlükəsizlik və məsuliyyət hərəkətlərinin (avans verilməsi, layihənin dayandırılması, ustanın gün loqunun dəyişdirilməsi və s.) izlənməsi.
- **HTTP Metodu və URL:** `GET /api/admin/audit-logs`
- **Headers:** `Authorization: Bearer <access_token>`
- **Query Params:**
  - `target_table` *(string, optional)*: `projects`, `daily_logs`, `advances`, `workers`, `project_materials`.
  - `page` *(integer, optional, default: 1)*
  - `limit` *(integer, optional, default: 50)*
- **Request Body:** Yoxdur.
- **Response:**
  - **`200 OK` (Uğurlu):**
    ```json
    {
      "success": true,
      "message": "Audit jurnalı uğurla təqdim edildi.",
      "data": {
        "logs": [
          {
            "id": "audit-1001",
            "actor": {
              "id": "c8b3f210-91a4-4f51-bfa6-8ef3e6a981c2",
              "full_name": "Qasımov Oxşar (Müdir)",
              "role": "ADMIN"
            },
            "action": "UPDATE_DAILY_LOG_M2",
            "target_table": "daily_logs",
            "target_id": "log-01",
            "details": {
              "old_done_m2": 450.00,
              "new_done_m2": 300.00,
              "reason": "Usta texniki səhv edərək 150 m² artıq yazmışdı, kamera fotosu ilə tutuşduruldu və düzəldildi."
            },
            "created_at": "2026-11-22T23:40:00+04:00"
          },
          {
            "id": "audit-1002",
            "actor": {
              "id": "c8b3f210-91a4-4f51-bfa6-8ef3e6a981c2",
              "full_name": "Qasımov Oxşar (Müdir)",
              "role": "ADMIN"
            },
            "action": "PAUSE_PROJECT",
            "target_table": "projects",
            "target_id": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
            "details": {
              "status": "DAYANDIRILIB",
              "pause_reason": "Güclü yağış səbəbindən dam örtüyünün quruması gözlənilir."
            },
            "created_at": "2026-11-22T23:05:00+04:00"
          }
        ],
        "pagination": {
          "total_items": 45,
          "current_page": 1,
          "total_pages": 1,
          "limit": 50
        }
      }
    }
    ```

---

### 8.3. Gündəlik Loqa Müdir Düzəlişi (Manual Override Daily Log)
- **Təyinat:** Ustanın sahədən göndərdiyi m² hesabatında səhv olduqda (məsələn, usta `450 m²` yazıb, amma fotoda cəmi `300 m²` görsənir) **yalnız müdir** bu rəqəmi dəyişə bilər. Dəyişiklik dərhal layihənin faizini yenidən hesablayır və `audit_logs` cədvəlinə məcburi izahatla qeyd edilir.
- **HTTP Metodu və URL:** `PATCH /api/admin/daily-logs/:id`
- **Headers:**
  ```http
  Authorization: Bearer <access_token>
  Content-Type: application/json
  ```
- **URL Params:** `id` *(string/uuid, required)*: Düzəliş ediləcək `daily_logs` ID-si.
- **Request Body:**
  ```json
  {
    "done_m2": 300.00,
    "material_note": "Səth qurudu. 6 vedrə mastika sərfiyyatı təsdiqləndi.",
    "is_below_norm": false,
    "admin_correction_reason": "Usta texniki səhv edərək 150 m² artıq yazmışdı, kamera fotosu ilə tutuşduruldu və düzəldildi."
  }
  ```
  - `done_m2` *(number, required, positive)*: Düzəldilmiş real kvadratmetr.
  - `material_note` *(string, optional)*: Yenilənmiş material qeydi.
  - `is_below_norm` *(boolean, optional)*: Normadan aşağı bayrağını manual dəyişmək.
  - `admin_correction_reason` *(string, required, min length: 10)*: Düzəlişin səbəbi (auditə yazılır).

- **Response:**
  - **`200 OK` (Uğurlu):**
    ```json
    {
      "success": true,
      "message": "Gündəlik hesabat uğurla düzəldildi, layihə faizi yeniləndi və audit qeydi yaradıldı.",
      "data": {
        "id": "log-01",
        "project_id": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
        "stage_id": "stage-02",
        "previous_done_m2": 450.00,
        "new_done_m2": 300.00,
        "admin_correction_reason": "Usta texniki səhv edərək 150 m² artıq yazmışdı, kamera fotosu ilə tutuşduruldu və düzəldildi.",
        "recalculated_stage": {
          "id": "stage-02",
          "completed_m2": 450.00,
          "target_m2": 600.00,
          "progress_percent": 75.0
        },
        "recalculated_project": {
          "total_completed_m2": 450.00,
          "progress_percent": 25.0
        },
        "updated_at": "2026-11-22T23:45:00+04:00"
      }
    }
    ```
  - **`400 Bad Request`:**
    ```json
    {
      "success": false,
      "message": "Düzəliş səbəbi (ən azı 10 simvol) mütləq daxil edilməlidir.",
      "error_code": "CORRECTION_REASON_REQUIRED",
      "details": null
    }
    ```
  - **`404 Not Found`:**
    ```json
    {
      "success": false,
      "message": "Düzəliş ediləcək gündəlik hesabat tapılmadı.",
      "error_code": "LOG_NOT_FOUND",
      "details": null
    }
    ```

---

## 9. Frontend (Məhəmməd) və Backend (Cəlil) İnteqrasiya Təlimatı

### 9.1. Frontend üçün Axios Müştəri Konfiqurasiyası
Frontend komandası (`api.js` və ya `axiosClient.js`) tokeni hər sorğuya avtomatik əlavə etmək və `401` xətalarında istifadəçini avtomatik giriş səhifəsinə yönləndirmək üçün aşağıdakı şablondan istifadə etməlidir:

```javascript
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api/admin',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Request Interceptor: Token əlavə olunması
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('oxsar_admin_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: 401 və xəta idarəetməsi
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('oxsar_admin_token');
      window.location.href = '/admin/login';
    }
    return Promise.reject(error.response ? error.response.data : error);
  }
);

export default api;
```

### 9.2. Backend üçün Prisma Transaksiya Qaydası (Layihə Yaratma Nümunəsi)
Cəlil layihə yaradarkən layihə və onun ilkin mərhələlərini (`project_stages`) mütləq **tək bir verilənlər bazası tranzaksiyasında** yaratmalıdır:

```typescript
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

export async function createProjectWithStages(data: CreateProjectDto, adminId: string) {
  const magicToken = 'ox-' + crypto.randomBytes(5).toString('hex'); // 12-char unikal token

  return await prisma.$transaction(async (tx) => {
    // 1. Mərhələlərin ümumi m² hesabı
    const totalTargetM2 = data.stages.reduce((sum, s) => sum + s.target_m2, 0);
    const totalAmount = totalTargetM2 * data.price_per_m2;

    // 2. Layihənin yaradılması
    const project = await tx.projects.create({
      data: {
        name: data.name,
        address: data.address,
        client_name: data.client_name,
        client_phone: data.client_phone,
        magic_token: magicToken,
        status: 'GOZLEMEDE',
        supply_type: data.supply_type,
        material_brand: data.material_brand,
        price_per_m2: data.price_per_m2,
        total_amount: totalAmount,
        warranty_years: data.warranty_years,
        otp_code: Math.floor(1000 + Math.random() * 9000).toString(),
      },
    });

    // 3. Mərhələlərin toplu yaradılması
    const stagePromises = data.stages.map((stg) =>
      tx.project_stages.create({
        data: {
          project_id: project.id,
          work_type_id: stg.work_type_id,
          stage_name: stg.stage_name,
          target_m2: stg.target_m2,
          completed_m2: 0,
        },
      })
    );
    await Promise.all(stagePromises);

    // 4. Audit Log qeydi
    await tx.audit_logs.create({
      data: {
        actor_id: adminId,
        action: 'CREATE_PROJECT_PROPOSAL',
        target_table: 'projects',
        target_id: project.id,
        details: { project_name: project.name, total_amount: totalAmount },
      },
    });

    return project;
  });
}
```

---

## 10. Xülasə Cədvəli (Endpoint Cheatsheet)

| HTTP Metodu | URL | Qısa Təyinatı | İcazə |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/admin/login` | Müdür girişi və JWT verilməsi | Public |
| `GET` | `/api/admin/me` | Cari müdür profil və icazə yoxlanışı | Admin |
| `GET` | `/api/admin/projects` | Bütün layihələrin siyahısı, faiz və mənfəət | Admin |
| `GET` | `/api/admin/projects/:id` | Tək layihənin tam detalları, foto və loglar | Admin |
| `POST` | `/api/admin/projects` | Yeni təklif/layihə yaratmaq (avtomatik magic-link) | Admin |
| `PUT` | `/api/admin/projects/:id` | Layihə məlumatlarını redaktə etmək | Admin |
| `PATCH` | `/api/admin/projects/:id/status` | Status dəyişmək (Dayandırılma səbəbi ilə) | Admin |
| `DELETE`| `/api/admin/projects/:id` | Layihəni silmək və ya arxivləşdirmək | Admin |
| `GET` | `/api/admin/workers` | İşçilərin siyahısı və canlı maaş/avans balansı | Admin |
| `POST` | `/api/admin/workers` | Yeni usta (PIN ilə) və ya fəhlə əlavə etmək | Admin |
| `PUT` | `/api/admin/workers/:id` | İşçi məlumatlarını və PIN kodunu yeniləmək | Admin |
| `PATCH` | `/api/admin/workers/:id/toggle-active` | İşçini aktiv/deaktiv etmək | Admin |
| `POST` | `/api/admin/advances` | Sürətli "+ Avans Ver" əməliyyatı (20-25 AZN) | Admin |
| `GET` | `/api/admin/workers/:id/advances` | Seçilmiş işçinin avans tarixçəsi | Admin |
| `POST` | `/api/admin/workers/:id/settle` | Maaş ödənişi və dövrün rəsmi bağlanması | Admin |
| `GET` | `/api/admin/salary-settlements` | Keçmiş maaş hesablaşmaları arxivi | Admin |
| `GET` | `/api/admin/work-types` | İş növləri, standart m² normativləri və qiymətlər | Admin |
| `POST` | `/api/admin/work-types` | Yeni iş növü və icra norması əlavə etmək | Admin |
| `PUT` | `/api/admin/work-types/:id` | İş növünü və normativi redaktə etmək | Admin |
| `GET` | `/api/admin/projects/:projectId/materials` | Obyektə göndərilən materialların maya dəyəri | Admin |
| `POST` | `/api/admin/projects/:projectId/materials` | Yeni material xərci əlavə etmək | Admin |
| `DELETE`| `/api/admin/materials/:id` | Səhv material qeydini silmək | Admin |
| `GET` | `/api/admin/analytics/summary` | Dashboard xülasəsi, gəlir, xərc və xalis mənfəət | Admin |
| `GET` | `/api/admin/audit-logs` | Sistem audit jurnalı və hərəkət izləri | Admin |
| `PATCH` | `/api/admin/daily-logs/:id` | Ustanın səhv m² hesabatına müdir düzəlişi | Admin |
