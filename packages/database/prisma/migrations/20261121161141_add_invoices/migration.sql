-- CreateEnum
CREATE TYPE "invoice_status" AS ENUM ('VALID', 'MISMATCH');

-- CreateEnum
CREATE TYPE "invoice_provider" AS ENUM ('TCT', 'VNPT', 'MISA', 'VIETTEL', 'FPT');

-- CreateEnum
CREATE TYPE "invoice_item_kind" AS ENUM ('GOODS', 'PROMOTION', 'DISCOUNT', 'NOTE');

-- CreateTable
CREATE TABLE "invoices" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "owner_id" TEXT NOT NULL,
    "provider" "invoice_provider" NOT NULL,
    "status" "invoice_status" NOT NULL,
    "invoice_template" VARCHAR(20) NOT NULL,
    "invoice_series" VARCHAR(20) NOT NULL,
    "invoice_number" VARCHAR(20) NOT NULL,
    "issued_at" DATE NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'VND',
    "exchange_rate" DECIMAL(18,6) NOT NULL DEFAULT 1,
    "seller_tax_code" VARCHAR(14) NOT NULL,
    "seller_name" TEXT NOT NULL,
    "seller_address" TEXT,
    "buyer_tax_code" VARCHAR(14),
    "buyer_name" TEXT,
    "buyer_address" TEXT,
    "subtotal_amount" DECIMAL(18,2) NOT NULL,
    "vat_amount" DECIMAL(18,2) NOT NULL,
    "total_amount" DECIMAL(18,2) NOT NULL,
    "validation_issues" JSONB NOT NULL DEFAULT '[]',
    "source_file_name" TEXT NOT NULL,
    "source_file_hash" CHAR(64) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "invoice_id" UUID NOT NULL,
    "kind" "invoice_item_kind" NOT NULL DEFAULT 'GOODS',
    "line_number" INTEGER NOT NULL,
    "code" VARCHAR(50),
    "name" TEXT NOT NULL,
    "unit" VARCHAR(50),
    "quantity" DECIMAL(18,6),
    "unit_price" DECIMAL(18,6),
    "discount_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "amount" DECIMAL(18,2) NOT NULL,
    "vat_rate" VARCHAR(10),
    "vat_amount" DECIMAL(18,2),

    CONSTRAINT "invoice_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "invoices_owner_issued_at_idx" ON "invoices"("owner_id", "issued_at");

-- CreateIndex
CREATE INDEX "invoices_owner_status_idx" ON "invoices"("owner_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_identity_idx" ON "invoices"("seller_tax_code", "invoice_template", "invoice_series", "invoice_number");

-- CreateIndex
CREATE INDEX "invoice_items_invoice_id_idx" ON "invoice_items"("invoice_id");

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
