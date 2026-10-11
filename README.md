# Equipment Rental & Service Management System

A full-stack, enterprise-grade equipment rental management system targeting **Odoo 20.0 Community** with a headless **Next.js 16 (TypeScript)** frontend application.

---

## 🏗️ Architecture Overview

```
                                      ┌────────────────────────────────────────┐
                                      │       Headless Client (Next.js 16)     │
                                      │       http://localhost:3000            │
                                      └──────────────────┬─────────────────────┘
                                                         │ JSON-RPC (CORS)
                                                         ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                              Odoo 20.0 Backend                               │
│                           http://localhost:8069                              │
├─────────────────────────┬────────────────────────────┬───────────────────────┤
│       rental_core       │        rental_sale         │    rental_website     │
│  - Categories & Equip.  │  - Sale Order Generation   │  - Public Catalog     │
│  - Overlapping Guards   │  - Customer Invoicing      │  - Online Booking     │
│  - Lifecycle & Return   │  - Account.Move Linking    │  - Customer Portal    │
│  - QWeb PDF Contracts   │  - Invoices Smart Button   │  - PDF Downloads      │
│  - Automated Crons      │                            │                       │
│  - JSON-RPC Controllers │                            │                       │
└─────────────────────────┴─────────────┬──────────────┴───────────────────────┘
                                        │
                                        ▼
                         ┌─────────────────────────────┐
                         │    PostgreSQL 16 Database   │
                         │    Mailpit (Port 8025)      │
                         └─────────────────────────────┘
```

---

## 📦 Odoo Modules

### 1. `rental_core`
- **Equipment Catalog**: Equipment codes (unique constraint), categories, daily prices, states (`available`, `rented`, `maintenance`), and images.
- **Rental Orders**: Auto-sequencing (`RNT/0001`), line computations (`daily_price * days`), chatter tracking.
- **Overlap Prevention**: Python constraints blocking any overlapping bookings across active orders (`confirmed`, `rented`, `overdue`).
- **Return & Maintenance**: Transient return wizard (`rental.return.wizard`) routing undamaged equipment to `available` and damaged equipment to maintenance with auto-generated maintenance logs.
- **Visuals & Analytics**: Calendar view, Kanban view with state progressbar & revenue summaries, Pivot view, and monthly revenue Graph view.
- **Reports & Email Automation**: QWeb PDF Rental Contract printable report, confirmation email with contract attachment, and scheduled return reminder emails.
- **Scheduled Crons**: Automated daily job marking overdue orders and dispatching reminder notices.
- **Headless API**: Public JSON-RPC routes (`/api/rental/equipment`, `/api/rental/check_availability`, `/api/rental/book`).

### 2. `rental_sale`
- Integrates equipment rentals directly with the sales & financial ledger.
- Generates linked `sale.order` and draft/posted customer invoices (`account.move`) upon order completion.
- Form view smart button displaying the linked invoice count and opening invoice records.

### 3. `rental_website`
- **Public Catalog (`/rental`)**: Browse available equipment by category with live specifications and pricing.
- **Online Booking Form (`/rental/book`)**: Public reservations creating draft rental orders in backend.
- **Customer Portal (`/my/rentals`)**: Portal customers can track active and past rentals and download signed contract PDFs.

---

## ⚡ Headless Web App (`./web`)

Built with **Next.js 16.4.0 (Turbopack)**, **TypeScript 5.6**, and **React 19**:
- **Design System**: Rich dark-mode glassmorphism interface with Google Fonts (Outfit & Plus Jakarta Sans).
- **Catalog Page (`/`)**: Search, filter by category, explore specs and daily pricing.
- **Detail Page (`/equipment/[id]`)**: Interactive date range selector with real-time calendar availability check against Odoo backend.
- **Booking Checkout (`/book`)**: Submits reservation request to `/api/rental/book` with instant validation and confirmation receipt.

---

## 🚀 Quickstart Guide

### Prerequisites
- Docker & Docker Compose
- Node.js 18+ & npm

### 1. Start Odoo 20 & Database
```bash
docker compose up -d
```

Services initialized:
- **Odoo 20 Backend**: [http://localhost:8069](http://localhost:8069) (Admin: `admin` / `admin`)
- **Mailpit Web UI**: [http://localhost:8025](http://localhost:8025)
- **PostgreSQL 16**: Port 5432

### 2. Update / Reinstall Modules (if needed)
```bash
docker compose exec odoo odoo -d mydb -u rental_core,rental_sale,rental_website --stop-after-init
docker compose restart odoo
```

### 3. Run the Next.js 16 Web Application
```bash
cd web
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧪 Testing & Verification

### Run Module Tests
```bash
docker compose exec odoo odoo -d mydb -u rental_core --test-tags /rental_core --stop-after-init
```

### Test Headless JSON-RPC API
```bash
# Check equipment catalog
curl -X POST http://localhost:8069/api/rental/equipment \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc": "2.0", "method": "call", "params": {}}'

# Real-time availability check
curl -X POST http://localhost:8069/api/rental/check_availability \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc": "2.0", "method": "call", "params": {"equipment_id": 1, "date_start": "2026-12-01", "date_end": "2026-12-05"}}'
```
