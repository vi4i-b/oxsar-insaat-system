-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'USTA', 'FEHLE');

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('GOZLEMEDE', 'AKTIV', 'DAYANDIRILIB', 'TAMAMLANDI', 'PASSIV');

-- CreateEnum
CREATE TYPE "SupplyType" AS ENUM ('MATERIALLI', 'ISCILIK');

-- CreateEnum
CREATE TYPE "LogStatus" AS ENUM ('OPEN', 'CLOSED');

-- CreateTable
CREATE TABLE "workers" (
    "id" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'FEHLE',
    "phone" TEXT NOT NULL,
    "password_hash" TEXT,
    "pin_hash" TEXT,
    "daily_wage" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "workers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_types" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "daily_norm_m2" DECIMAL(10,2) NOT NULL,
    "default_price_m2" DECIMAL(10,2) NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "work_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "client_name" TEXT NOT NULL,
    "client_phone" TEXT NOT NULL,
    "magic_token" TEXT NOT NULL,
    "status" "ProjectStatus" NOT NULL DEFAULT 'GOZLEMEDE',
    "pause_reason" TEXT,
    "supply_type" "SupplyType" NOT NULL DEFAULT 'MATERIALLI',
    "material_brand" TEXT,
    "price_per_m2" DECIMAL(10,2) NOT NULL,
    "total_amount" DECIMAL(12,2) NOT NULL,
    "warranty_years" INTEGER NOT NULL DEFAULT 5,
    "otp_code" TEXT,
    "completed_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_stages" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "work_type_id" TEXT NOT NULL,
    "stage_name" TEXT NOT NULL,
    "target_m2" DECIMAL(10,2) NOT NULL,
    "completed_m2" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "project_stages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_logs" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "usta_id" TEXT NOT NULL,
    "helper_ids" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "work_date" DATE NOT NULL,
    "morning_media_url" TEXT,
    "morning_time" TEXT,
    "evening_media_url" TEXT,
    "evening_time" TEXT,
    "stage_id" TEXT,
    "done_m2" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "material_note" TEXT,
    "is_below_norm" BOOLEAN NOT NULL DEFAULT false,
    "status" "LogStatus" NOT NULL DEFAULT 'OPEN',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "daily_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "advances" (
    "id" TEXT NOT NULL,
    "worker_id" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "given_date" DATE NOT NULL,
    "note" TEXT,
    "created_by" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "advances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "salary_settlements" (
    "id" TEXT NOT NULL,
    "worker_id" TEXT NOT NULL,
    "period_start" DATE NOT NULL,
    "period_end" DATE NOT NULL,
    "worked_days" INTEGER NOT NULL,
    "gross_salary" DECIMAL(10,2) NOT NULL,
    "total_advances" DECIMAL(10,2) NOT NULL,
    "net_paid" DECIMAL(10,2) NOT NULL,
    "paid_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "salary_settlements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_materials" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "item_name" TEXT NOT NULL,
    "quantity" DECIMAL(10,2) NOT NULL,
    "unit_cost" DECIMAL(10,2) NOT NULL,
    "total_cost" DECIMAL(10,2) NOT NULL,
    "added_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_materials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "actor_id" TEXT,
    "action" TEXT NOT NULL,
    "target_table" TEXT NOT NULL,
    "target_id" TEXT,
    "details" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "workers_phone_key" ON "workers"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "projects_magic_token_key" ON "projects"("magic_token");

-- AddForeignKey
ALTER TABLE "project_stages" ADD CONSTRAINT "project_stages_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_stages" ADD CONSTRAINT "project_stages_work_type_id_fkey" FOREIGN KEY ("work_type_id") REFERENCES "work_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_logs" ADD CONSTRAINT "daily_logs_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_logs" ADD CONSTRAINT "daily_logs_usta_id_fkey" FOREIGN KEY ("usta_id") REFERENCES "workers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_logs" ADD CONSTRAINT "daily_logs_stage_id_fkey" FOREIGN KEY ("stage_id") REFERENCES "project_stages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "advances" ADD CONSTRAINT "advances_worker_id_fkey" FOREIGN KEY ("worker_id") REFERENCES "workers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "salary_settlements" ADD CONSTRAINT "salary_settlements_worker_id_fkey" FOREIGN KEY ("worker_id") REFERENCES "workers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_materials" ADD CONSTRAINT "project_materials_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "workers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
