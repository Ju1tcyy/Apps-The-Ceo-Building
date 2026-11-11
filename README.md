# The CEO Building Management System (Mobile-First)

Satu aplikasi **MOBILE-FIRST** terpadu untuk mengelola seluruh spektrum operasional gedung **The CEO Building** (Jakarta).

Sistem ini dibangun secara penuh mengacu pada dokumen spesifikasi `THE_CEO_BUILDING_MANAGEMENT_SPEC.md` sebagai *single source of truth* dan acuan visual enterprise navy/white/gold dari mockup tiga layar yang diadaptasi 100% untuk dimensi smartphone (Android & iOS).

---

## 📱 Arsitektur Mobile-First Terpadu (5 Roles)

Kelima peran internal gedung menggunakan **aplikasi mobile terpadu yang sama** tanpa sidebar desktop:
1. **Engineer (Teknisi Lapangan):**
   - *Beranda* (`/mobile/home`), *Tiket* (`/mobile/tickets`), *Tugas* (`/mobile/tasks`), *Shift* (`/mobile/attendance`), *Profil* (`/profile`).
   - Mockup Screen 3: Sapaan teknisi, kartu tiket ditugaskan, tombol aksi cepat *Clock In (Live Camera anti-galeri)* dan *Scan QR*, checklist tugas harian, dan bar progres pemeliharaan.
2. **SPV (Supervisor Engineering):**
   - *Dashboard* (`/dashboard`), *Tiket* (`/engineering`), *Roster* (`/engineering/roster`), *Laporan* (`/reports`), *Profil* (`/profile`).
   - Mockup Screen 2 di smartphone: 4 KPI cards 2x2, kartu status tiket, circular SLA gauge, monitoring shift & teknisi standby, tombol aksi ekspor laporan mingguan (khusus SPV).
3. **Manager (Building Manager):**
   - *Dashboard* (`/dashboard`), *Approval AI* (`/ai-agent`), *Stok* (`/inventory`), *Billing* (`/billing`), *Profil* (`/profile`).
   - Antrian persetujuan AI Level 3 (*restock procurement* & *forced reassignment* tiket darurat), pengawasan stok krisis, dan eskalasi tagihan.
4. **Accounting (Keuangan):**
   - *Dashboard* (`/dashboard`), *Tagihan* (`/billing`), *Reminder* (`/billing/reminders`), *Audit* (`/audit-log`), *Profil* (`/profile`).
   - Penerbitan invoice sewa/service charge, pencatatan pembayaran dengan proteksi anti-overpayment, dan monitor jadwal reminder multi-tahap (H-14 s/d H+7).
5. **Direksi (Board of Directors):**
   - *Executive* (`/dashboard`), *Insights AI* (`/ai-agent`), *Laporan* (`/reports`), *Audit* (`/audit-log`), *Profil* (`/profile`).
   - Mockup Screen 1 di smartphone: KPI strategis (SLA, Inventory, Billing, AI), kartu performa operasional, quick insights dinamis, bar kesehatan per modul, dan kartu status gedung.

---

## 🌐 Public Tenant Portal (Mobile Web Tanpa Login)
- Formulir pengaduan gangguan publik (`/tenant/submit`) dengan auto-numbering `TC-YYYYMMDD-XXXX`.
- Pelacakan status tiket publik yang aman (`/tenant/track`) melalui visual stepper vertikal tanpa mengekspos data internal gedung.

---

## 🛡️ Kebijakan Ketat: Strict Zero Dummy Data Policy

- **Sistem dimulai dalam keadaan database bersih 100% tanpa mock data, fake tickets, fake invoices, atau fake users.**
- Seluruh dasbor dan daftar kartu menampilkan *empty state* yang elegan dan informatif disertai panduan aksi (*Call-to-Action*) ketika belum ada transaksi operasional nyata.
- Inisialisasi akun administrator pertama diamankan melalui rute `/setup` yang secara otomatis terkunci permanen setelah akun pertama dibuat.

---

## 🚀 Panduan Menjalankan Sistem

### 1. Prasyarat Lingkungan
- Node.js LTS (v22 / v24)
- npm / npx
- SQLite3 (atau PostgreSQL via Prisma)

### 2. Instalasi & Migrasi Database
```bash
npm install
npx prisma generate
npx prisma db push
```

### 3. Menjalankan Server Development
```bash
npm run dev
```
Buka browser di `http://localhost:8080`. Jika sistem baru pertama kali dipasang, Anda akan diarahkan ke halaman `/setup` untuk membuat akun administrator gedung.

### 4. Menjalankan Rangkaian Pengujian Unit (29 Tests)
```bash
npm test
```
Seluruh 29 unit tests mencakup:
- **Authentication & RBAC:** Password hashing bcrypt, verifikasi token JWT jose, proteksi ekspor SPV-only, proteksi verifikasi tiket.
- **Timezone & Shifts:** Identifikasi shift aktif Asia/Jakarta (WIB) dan pergeseran tanggal roster shift 3 malam.
- **Engineering Core:** SLA response threshold per prioritas, deteksi overdue, auto-assignment dengan validasi kehadiran CEO area, larangan verifikasi diri oleh teknisi, validasi anti-duplikasi roster.
- **Inventory Engine:** Pemotongan stok hanya pada status `DONE`, proteksi anti-stok negatif, idempoten submission konsumsi material, deteksi batas minimum stok, serta kalkulasi varian stocktake.
- **Tenant Billing:** Kalkulasi status tagihan, pencegahan pembayaran melebihi saldo terutang, penjadwalan multi-tahap H-14 s/d H+7, auto-cancellation pengingat saat lunas, dan abstraksi Meta Cloud API.
- **AI Agent Intelligence:** Klasifikasi risiko Level 1, 2, dan 3; proteksi approval Level 3 (penolakan akses teknisi); serta keterlacakan audit log AI.

### 5. Build Produksi
```bash
npm run build
npm start
```
Seluruh 31 halaman dan rute API terkompilasi bersih tanpa *type error* (TypeScript 0 error).

---

## 📐 Arsitektur Kode & Desain

- **Framework:** Next.js 15 (App Router, Server Actions, React 19)
- **Styling:** Tailwind CSS dengan palet warna enterprise:
  - Primary Navy: `#142D4E`
  - Muted Gold: `#C6A66B`
  - Clean Background: `#F5F7FA`
  - Pure Surface: `#FFFFFF`
  - Enterprise Text: `#172B43`
- **Database & ORM:** SQLite via Prisma ORM (`dev.db`)
- **Keamanan:** Bcrypt, Jose JWT HTTP-only Cookie, Role-Based Access Control (5 Roles: Direksi, SPV, Manager, Accounting, Engineer).
