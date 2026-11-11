# THE CEO BUILDING MANAGEMENT SYSTEM
# IMPLEMENTATION PLAN & ARCHITECTURE SPECIFICATION

**Dokumen Sumber Kebenaran:** `THE_CEO_BUILDING_MANAGEMENT_SPEC.md`  
**Status:** Dikonfirmasi User - Menjadi acuan teknis dan tahapan eksekusi  
**Zona Waktu:** `Asia/Jakarta` (WIB)  
**Prinsip Data Utama:** **Strict Zero Dummy Data Policy**. Tidak ada mock data, fake records, fake users, angka rekaan, atau seed bisnis. Aplikasi beroperasi dengan data riil atau menampilkan *empty state* yang informatif.

---

## 1. Keputusan Bisnis yang Dikonfirmasi (Confirmed Business Decisions)

1. **Shift Definitions:**
   - **Shift 1 (Pagi):** 06:00 - 14:00 WIB
   - **Shift 2 (Siang):** 14:00 - 22:00 WIB
   - **Shift 3 (Malam):** 22:00 - 06:00 WIB (Lintas tengah malam)
2. **SLA & Escalation Policy:**
   - **Response Threshold (Respon Pertama):**
     - Emergency: 15 menit
     - High: 30 menit
     - Medium: 1 jam
     - Low: 2 jam
   - **Resolution Target:** *Open-ended* (tanpa batas waktu penyelesaian yang mengikat/pinalti kaku karena sifat perbaikan fisik yang bervariasi). Durasi aktual tetap dicatat untuk metrik dan KPI.
3. **Inventory Negative Stock Policy:**
   - Penolakan keras untuk stok minus (cegah stok negatif). Transaksi konsumsi ditolak jika stok fisik di sistem tidak mencukupi, kecuali diizinkan melalui *Emergency Override* oleh Manager.
4. **Retensi Foto Absensi (UU PDP):**
   - File foto selfie live disimpan secara privat maksimal 30 hari untuk verifikasi SPV, lalu dihapus/diarsipkan otomatis. Log timestamp dan validasi lokasi QR disimpan permanen.
5. **Kanal Pengingat WhatsApp Resmi:**
   - Abstraksi interface resmi (Meta Cloud API). Bila kredensial belum tersedia, reminder berjalan via In-App Notification dengan status pending.

---

## 2. Ringkasan Eksekutif & Prinsip Desain Mobile-First

Platform **The CEO Building Management System** dibangun secara eksklusif sebagai **aplikasi MOBILE-FIRST**. Seluruh lima peran internal gedung menggunakan aplikasi mobile terpadu yang sama yang beradaptasi secara dinamis sesuai peran, menu, dan izin (*permissions*) masing-masing:

1. **Aplikasi Mobile Terpadu untuk 5 Peran Internal:**
   - **Engineer (Teknisi Lapangan):** *Beranda | Tiket | Tugas | Shift | Profil* — Hero card, quick action (Clock In & Scan QR), daftar tiket ditugaskan, checklist pekerjaan harian, absensi live camera CEO area, dan pemotongan stok consumable saat tiket `DONE`.
   - **SPV (Supervisor Engineering):** *Dashboard | Tiket | Roster | Laporan | Profil* — SPV Command Dashboard mobile: distribusi tiket, circular SLA performance gauge, shift aktif & ketersediaan teknisi standby, ekspor laporan mingguan khusus SPV, dan verifikasi tiket.
   - **Manager (Building Manager):** *Dashboard | Approval AI | Stok | Billing | Profil* — Tinjauan kesehatan operasional, antrian approval AI Level 3 (restock stok & forced reassignment), pengawasan gudang, dan eskalasi faktur tertunggak.
   - **Accounting (Keuangan):** *Dashboard | Tagihan | Rincian | Reminder | Profil* — Metrik penagihan sewa/service charge, pencatatan pembayaran cicilan/lunas dengan proteksi anti-overpayment, dan monitor jadwal reminder multi-tahap (H-14 s/d H+7).
   - **Direksi (Board of Directors):** *Executive | Insights AI | Laporan | Audit | Profil* — Executive Dashboard mobile: KPI strategis (SLA, Inventory, Billing, AI), performa operasional, quick insights dinamis, kesehatan per modul, dan audit log kronologis.
2. **Public Tenant Mobile Portal:**
   - Formulir pelaporan gangguan publik mobile-web tanpa login (`/tenant/submit`).
   - Pelacakan status tiket dengan nomor tiket unik aman (`/tenant/track`) melalui visual stepper vertikal tanpa mengekspos catatan internal gedung.

### Karakteristik & Shell Mobile-First
- **Smartphone Viewport:** Desain dioptimalkan untuk dimensi smartphone (Android & iOS, lebar 360px - 428px). Pada layar lebar, aplikasi ditampilkan dalam container frame terpusat (`max-w-md w-full min-h-screen bg-background relative pb-20 shadow-xl`).
- **Bottom Navigation (Thumb Zone):** Menggantikan sidebar desktop secara permanen dengan *Bottom Navigation Bar* fleksibel sesuai peran di area jempol (one-handed usability).
- **Mobile Cards (Pengganti Tabel Lebar):** Seluruh data tiket, inventaris, faktur, laporan mingguan, dan log aktivitas disajikan dalam kartu vertikal mobile-friendly yang mudah di-tap dan dilengkapi status badge jelas.
- **Touch-Friendly Controls:** Target sentuh tombol dan elemen interaktif minimal 44x44 px.

### Visual Identity (Sesuai Mockup)
- **Primary Navy:** `#142D4E` (Header mobile, hero cards, primary action buttons)
- **Accent Muted Gold:** `#C6A66B` (Aksen branding The CEO Building, active bottom navigation icon, highlight badges, export CTA)
- **Background Light Gray:** `#F5F7FA` (Latar belakang aplikasi)
- **Surface White:** `#FFFFFF` (Kartu dan container konten)
- **Text Primary:** `#172B43`
- **Text Muted:** `#718096`
- **Border Subtle:** `#E5EAF0`
- **Status Indicators:**
  - *Open / Info:* `#3977B8`
  - *Assigned:* `#2B6CB0`
  - *In Progress:* `#D69E2E` (Amber)
  - *Done / Success:* `#16845B` (Green/Teal)
  - *Verified:* `#16845B`
  - *Overdue / Emergency:* `#C84C4C` (Red)

---

## 3. Arsitektur Aplikasi & Tech Stack

- **Framework:** Next.js 15+ (App Router) dengan TypeScript.
- **Styling:** Tailwind CSS dengan konfigurasi Design Tokens kustom mobile-first (Navy, Gold, Neutral palettes) dan Lucide Icons.
- **Database & ORM:** SQLite dengan Prisma ORM / schema migrations versioning terstruktur.
- **Autentikasi & Sesi:** Cookie-based HTTP-only session tokens menggunakan signed JWT (Jose) / bcrypt password hashing.
- **Validasi:** Zod schemas pada Server Actions, API routes, dan client-side form hooks.
- **UI Components:** Kustom komponen Tailwind mobile-first (MobileCards, MobileHeader, RoleBottomNav, circular SLA progress, timeline vertikal, live video camera scanner, action sheets).

---

## 4. Rancangan Database Relasional (Schema Blueprint)

1. **RBAC & User:** `users`, `roles`, `permissions`, `user_roles`, `role_permissions`.
2. **Master Data:** `tenants`, `units` (dengan `qr_token_hash`), `locations`, `engineer_profiles`.
3. **Engineering:**
   - `shift_definitions` (Shift 1, 2, 3; jam mulai/selesai; `crosses_midnight`).
   - `shift_rosters` (rotasi mingguan, anti-bentrok).
   - `attendance_records` (selfie live camera, QR token lokasi CEO area, status verifikasi, persetujuan PDP 30 hari).
   - `tickets` (`OPEN` -> `ASSIGNED` -> `IN_PROGRESS` -> `DONE` -> `VERIFIED`, response_due_at, SLA timestamps).
   - `ticket_events` (riwayat status append-only).
   - `daily_tasks` (task rutin SPV ke teknisi).
   - `shift_handovers` (catatan serah terima shift).
4. **Inventory:**
   - `inventory_items` (kuantitas, minimum quantity, lokasi simpan).
   - `inventory_transactions` (transaksi atomik, `idempotency_key`, referensi tiket).
   - `ticket_consumables` (pencatatan konsumsi saat tiket `DONE`).
   - `stocktake_sessions` & `stocktake_lines` (stock opname).
5. **Billing:**
   - `invoices` (`DRAFT`, `ISSUED`, `UNPAID`, `PARTIALLY_PAID`, `PAID`, `OVERDUE`).
   - `invoice_payments` (rekonsiliasi saldo).
   - `invoice_reminders` (tahap H-14, H-7, H-0, H+1, H+3, H+7).
6. **AI & Laporan:**
   - `ai_recommendations`, `approval_requests`, `ai_action_logs`.
   - `weekly_reports` (khusus role SPV untuk export).
   - `audit_logs` (immutable append-only trail).

---

## 5. Rencana Tahapan Eksekusi

Sesuai instruksi pengerjaan: **Mulai dari Foundation dan Engineering Core. Setelah setiap tahap, jalankan testing dan laporkan hasilnya.**

### Tahap 0: Foundation ✅ (COMPLETED & TESTED)
1. Setup package.json, TypeScript, Tailwind CSS dengan Design Tokens mockup.
2. Inisialisasi Prisma & skema database relasional (semua tabel).
3. Modul Autentikasi (Password hashing bcrypt, Session Cookie signed JWT, Login/Logout).
4. Wizard Onboarding Admin (`/setup`) untuk pembuatan akun pertama secara aman tanpa hardcoded password.
5. Middleware RBAC & proteksi route server-side.
6. Service Audit Log append-only.
7. Komponen layout (AppSidebar Navy, AppHeader, MobileBottomNav) dan reusable UI (MetricCard, EmptyState, LoadingSkeleton, ConfirmDialog).
8. **Pengujian Foundation & Laporan Hasil: 11 tests passing.**

### Tahap 1: Engineering Core ✅ (COMPLETED & TESTED)
1. CRUD Master Data (Tenants, Units dengan QR hash, Locations, Engineer Profiles).
2. Definisi Shift (Shift 1, 2, 3) & Roster Mingguan oleh SPV.
3. Modul Absensi Engineer (Live Camera capture dari MediaDevices, larangan galeri, validasi QR code lokasi area CEO, consent PDP 30 hari).
4. Formulir Tiket Publik & Tiket Internal (SPV/Manager).
5. Mesin Auto-Assignment (pemeriksaan waktu WIB, shift aktif, status clock in teknisi).
6. Manajemen Lifecycle Tiket (`OPEN` -> `ASSIGNED` -> `IN_PROGRESS` -> `DONE` -> `VERIFIED`) & Response Threshold SLA.
7. Daily Task & Shift Handover.
8. **Pengujian Engineering Core & Laporan Hasil: 11 tests passing.**

### Tahap 2: Inventory Consumables & SPV Weekly Report ✅ (COMPLETED & TESTED)
1. Quantity-based consumable inventory management & low-stock alerts.
2. Deduction of consumables strictly on ticket status `DONE` with idempotency & anti-negative stock policy.
3. Stock movements audit trail and Stocktake / Opname sessions with variance reconciliation.
4. Weekly Operational Report generator.
5. **SPV-Only Export Gate** with automatic append-only audit logging.
6. **Pengujian Inventory & Report: 7 tests passing (total 18 tests).**

### Tahap 3: Tenant Billing & Reminder Engine ✅ (COMPLETED & TESTED)
1. Dynamic invoice tracking (`UNPAID`, `PARTIALLY_PAID`, `PAID`, `OVERDUE`).
2. Anti-overpayment verification guard.
3. Automated multi-stage reminders (`H-14`, `H-7`, `H-0`, `H+1`, `H+3`, `H+7`).
4. Auto-cancellation of reminders when invoice is marked `PAID`.
5. Official Meta Cloud API WhatsApp provider abstraction with graceful in-app notification fallback.
6. **Pengujian Billing & Reminders: 6 tests passing (total 24 tests).**

### Tahap 4: AI Agent Governance & Executive Oversight ✅ (COMPLETED & TESTED)
1. AI Agent in Suggestion & Draft Mode with risk level classification:
   - Level 1: Routine / Draft weekly report.
   - Level 2: SPV notification for overdue SLA response and delinquent invoices.
   - Level 3: Mandatory human approval queue for stock procurement and forced emergency reassignment.
2. Full explainability & audit trail for AI actions (`ai_recommendations`, `approval_requests`, `ai_action_logs`).
3. Executive Dashboard (Direksi) matching Screen 1 mockup with live data telemetry & clean empty states.
4. SPV Dashboard matching Screen 2 mockup with ticket breakdown, SLA circular progress, and standby engineer monitoring.
5. **Pengujian AI Agent & Executive Oversight: 5 tests passing (total 29 tests, Next.js build: 31 routes compiled).**

---

## 6. Eksekusi Koreksi Platform: Transformasi 100% Mobile-First 📱

Mengacu pada instruksi perbaikan platform dari pengguna: **Seluruh aplikasi The CEO Building Management System beroperasi sebagai aplikasi mobile-first tanpa desktop sidebar**.

### Sub-Tahap A: Unified Mobile Shell & Role-Based Bottom Navigation
1. Hapus `AppSidebar` desktop secara permanen dari layout aplikasi.
2. Buat `MobileShell` terpadu: container smartphone terpusat (`w-full max-w-md min-h-screen bg-background relative pb-20 shadow-xl`) yang responsif untuk Android dan iOS.
3. Buat `MobileHeader`: header ringkas yang memuat brand The CEO Building, badge peran aktif (`DIREKSI`, `SPV`, `MANAGER`, `ACCOUNTING`, `ENGINEER`), indikator shift/tanggal WIB, dan avatar pengguna dengan menu cepat profil/logout.
4. Buat `RoleBottomNav`: *bottom navigation bar* yang secara otomatis merender 5 item menu yang tepat di *thumb zone* sesuai peran pengguna:
   - **Engineer:** *Beranda (/mobile/home), Tiket (/mobile/tickets), Tugas (/mobile/tasks), Shift (/mobile/attendance), Profil (/mobile/profile)*
   - **SPV:** *Dashboard (/dashboard), Tiket (/engineering), Roster (/engineering/roster), Laporan (/reports), Profil (/profile)*
   - **Manager:** *Dashboard (/dashboard), Approval (/ai-agent), Stok (/inventory), Billing (/billing), Profil (/profile)*
   - **Accounting:** *Dashboard (/dashboard), Tagihan (/billing), Rincian (/billing/invoices), Reminder (/billing/reminders), Profil (/profile)*
   - **Direksi:** *Executive (/dashboard), Insights (/ai-agent), Laporan (/reports), Audit (/audit-log), Profil (/profile)*

### Sub-Tahap B: Konversi 5 Dasbor Peran ke Dimensi Smartphone
1. **Direksi Mobile Executive Dashboard:** Adaptasi Screen 1 ke smartphone — 4 KPI cards responsif 2x2, Operational Performance card mobile, Quick Insights card, Module Overview health progress bars, dan status gedung.
2. **SPV Mobile Command Dashboard:** Adaptasi Screen 2 ke smartphone — 4 KPI cards 2x2, status tiket horizontal scroll / 2-column cards, circular SLA performance gauge, shift aktif & ketersediaan teknisi standby, tombol aksi ekspor laporan.
3. **Manager Mobile Dashboard:** Ringkasan operasional lintas divisi, peringatan stok krisis, antrian approval level 3, dan shortcut cepat.
4. **Accounting Mobile Dashboard:** Kartu ringkasan finansial (total tertagih, outstanding, overdue), rasio koleksi, dan antrian faktur jatuh tempo.
5. **Engineer Mobile Dashboard:** Screen 3 mockup (hero card, quick clock-in/QR scan, assigned tickets, today's tasks, maintenance progress).

### Sub-Tahap C: Konversi Tampilan Data dari Tabel Lebar ke Mobile Cards
1. **Tiket (`/engineering`):** Ganti tabel desktop menjadi daftar kartu `MobileTicketCard` (nomor tiket, badge prioritas, lokasi & unit, PIC, response threshold countdown, status badge, tombol aksi cepat).
2. **Inventaris (`/inventory`):** Ganti tabel menjadi `MobileInventoryCard` (nama item, kode SKU, kuantitas saat ini vs minimum, bar visual stok, badge alert restock, tombol cepat tambah stok).
3. **Billing (`/billing`):** Ganti tabel menjadi `MobileInvoiceCard` (nomor invoice, nama tenant & unit, tanggal jatuh tempo, nominal tagihan, sisa terutang, status badge, tombol catat pembayaran).
4. **Laporan Mingguan (`/reports`):** Ganti tabel menjadi kartu ringkasan tugas mingguan `MobileReportCard` dengan tombol ekspor SPV mobile.
5. **Audit Log (`/audit-log`):** Ganti tabel menjadi *vertical chronological timeline* mobile dengan badge aktor, aksi, dan waktu format WIB.
6. **Roster Shift (`/engineering/roster`):** Tampilan kartu harian dengan tab 3 shift dan tombol penugasan modal bottom sheet.

### Sub-Tahap D: Touch Target & Pengalaman Satu Tangan (One-Handed Usability)
1. Seluruh tombol, switch, dan input memiliki tinggi/lebar minimal 44x44 px.
2. Aksi-aksi utama (*submit form*, simpan perubahan, verifikasi) diposisikan di bagian bawah layar atau sticky action bar yang mudah dijangkau jempol.
3. Dialog konfirmasi dan form input cepat disajikan dalam bentuk *bottom sheet* mobile.

### Sub-Tahap E: Optimasi Form Publik Tenant Mobile Web (`/tenant/*`)
1. `/tenant/submit`: Form 1 kolom dengan input berukuran besar, pengambilan foto kamera/galeri smartphone, validasi nomor WA Indonesia, dan layar sukses nomor tiket `#TC-YYYYMMDD-XXXX`.
2. `/tenant/track`: Visual stepper vertikal pelacakan status tiket tanpa membuka data internal gedung.

### Sub-Tahap F: Verifikasi Komprehensif & Uji Regresi
1. Menjalankan seluruh 29 unit tests (`npm test`) untuk memastikan aturan bisnis, RBAC, dan logika transaksi tetap 100% valid.
2. Pengecekan TypeScript (`npx tsc --noEmit`) dan build produksi Next.js (`npm run build`).
3. Pengujian respon layar pada viewport smartphone Android & iOS.
