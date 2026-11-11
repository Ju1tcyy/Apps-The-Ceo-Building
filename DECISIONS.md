# DECISIONS REGISTER (LOG KEPUTUSAN TEKNIS)

**Project:** The CEO Building Management System  
**Single Source of Truth:** `THE_CEO_BUILDING_MANAGEMENT_SPEC.md`

Dokumen ini mencatat asumsi, justifikasi teknis, dan keputusan arsitektur yang diambil. Keputusan bisnis mengacu mutlak pada spesifikasi dan persetujuan pengguna.

---

## ADR-001: Pilihan Tech Stack Aplikasi
- **Tanggal:** 2026-11-08
- **Konteks:** Repository awal kosong. Dibutuhkan stack yang stabil, mendukung 3 form-factor (Web Admin Desktop, Mobile PWA Engineer, Public Form), performan, tipe aman (*type-safe*), dan mudah dirawat.
- **Keputusan:**
  - **Framework:** Next.js 15 (App Router) dengan TypeScript.
  - **Styling:** Tailwind CSS dengan design tokens kustom sesuai mockup (`#142D4E` Navy, `#C6A66B` Gold, `#F5F7FA` BG, `#FFFFFF` Surface).
  - **Database & ORM:** SQLite dengan Prisma ORM untuk lingkungan awal/internal, dengan dukungan migration versioning.
  - **Icons:** Lucide React.
  - **Auth:** Stateless HTTP-only Session Cookie dengan token JWT (Jose) dan enkripsi kata sandi (Bcrypt).
- **Justifikasi:** Satu repositori (monolit terpadu) untuk 3 pengalaman pengguna menghilangkan fragmentasi backend/frontend. SQLite + Prisma memberikan konsistensi ACID, transaksi database relasional, foreign keys, serta zero setup overhead tanpa memerlukan server database eksternal terpisah.

---

## ADR-002: Zero Dummy Data Policy & Onboarding Awal
- **Tanggal:** 2026-11-08
- **Konteks:** Spesifikasi melarang keras pembuatan dummy data, seed data bisnis, akun contoh dengan password hardcoded, atau tiket/invoice rekaan.
- **Keputusan:**
  - Tidak ada seeder yang memasukkan data operasional palsu (tidak ada dummy user seperti "Andi Pratama", tidak ada tiket "TC-001", tidak ada stok lampu 50 pcs).
  - Skema database diinisialisasi bersih.
  - Sediakan mekanisme onboarding awal: rute `/setup` (atau CLI bootstrap) yang hanya dapat diakses saat database belum memiliki akun administrator. Administrator memasukkan akun pertama dengan password aman. Setelah akun pertama dibuat, rute `/setup` terkunci permanen.
  - Semua UI dashboard menampilkan *empty state* yang elegan dan informatif apabila belum ada data.

---

## ADR-003: Konsumsi Stok Idempotent & Transaksional
- **Tanggal:** 2026-11-08
- **Konteks:** Penggunaan barang inventaris harus akurat, tidak boleh terpotong saat tiket dibuat atau dalam proses, dan tidak boleh terpotong ganda saat submit ulang.
- **Keputusan:**
  - Titik posting stok ditetapkan saat engineer submit tiket berstatus `DONE`.
  - Operasi pengurangan stok, pencatatan entri pemakaian tiket (`ticket_consumables`), dan riwayat pergerakan stok (`inventory_transactions`) dibungkus dalam satu transaksi database Prisma (`$transaction`).
  - Entri transaksi menggunakan `idempotency_key` (berbasis `ticket_id + timestamp/action`). Submit berulang dengan kunci yang sama akan diabaikan tanpa duplikasi pemotongan.

---

## ADR-004: Penanganan Zona Waktu & Waktu Shift (Dikonfirmasi User)
- **Tanggal:** 2026-11-08
- **Konteks:** Gedung berlokasi di Jakarta. Jam operasional, auto-assignment, pencatatan absensi, dan due date SLA mengacu pada WIB.
- **Keputusan:**
  - Standar 3 shift The CEO Building:
    - **Shift 1 (Pagi):** 06:00 - 14:00 WIB
    - **Shift 2 (Siang):** 14:00 - 22:00 WIB
    - **Shift 3 (Malam):** 22:00 - 06:00 WIB (Melintasi tengah malam)
  - Semua waktu disimpan dalam UTC di database, namun diparsing dan ditampilkan secara konsisten dalam zona waktu `Asia/Jakarta` (WIB / UTC+7).

---

## ADR-005: Kebijakan SLA & Response Threshold (Dikonfirmasi User)
- **Tanggal:** 2026-11-08
- **Konteks:** Respon teknisi terhadap tiket membutuhkan batas waktu respon yang jelas agar eskalasi ke SPV dapat berjalan jika teknisi tidak merespons. Namun sifat pekerjaan teknis gedung memiliki durasi penyelesaian yang bervariasi.
- **Keputusan:**
  - Response Threshold (Waktu respon pertama untuk eskalasi ke SPV):
    - **Emergency:** 15 menit
    - **High:** 30 menit
    - **Medium:** 1 jam
    - **Low:** 2 jam
  - **Resolution Target:** Tanpa batas waktu penyelesaian yang mengikat (*open-ended*), durasi aktual penyelesaian tetap direkam untuk pelaporan dan KPI, namun tidak dikenakan batas mati otomatis karena sifat pekerjaan fisik gedung tidak menentu.

---

## ADR-006: Kebijakan Batas Stok Negatif (Dikonfirmasi User)
- **Tanggal:** 2026-11-08
- **Keputusan:** Transaksi konsumsi otomatis ditolak jika stok fisik di sistem tidak mencukupi (pencegahan stok minus). Override darurat hanya dapat dilakukan jika ada persetujuan Manager dengan pencatatan audit trail lengkap.

---

## ADR-007: Retensi Foto Absensi UU PDP (Dikonfirmasi User)
- **Tanggal:** 2026-11-08
- **Keputusan:** File foto selfie attendance disimpan secara privat selama 30 hari untuk verifikasi SPV, setelahnya diarsipkan/dihapus sesuai kebijakan retensi. Metadata kehadiran, QR location, dan timestamp disimpan permanen.

---

## ADR-008: Abstraksi Provider WhatsApp Resmi (Dikonfirmasi User)
- **Tanggal:** 2026-11-08
- **Keputusan:** Menggunakan interface provider resmi (Meta Cloud API). Selama kredensial belum diisi, kanal notifikasi berjalan via In-App Notification dan reminder WhatsApp berstatus pending.

---

## ADR-009: Hak Khusus Export Weekly Report (SPV Only)
- **Tanggal:** 2026-11-08
- **Konteks:** Spesifikasi menyatakan secara eksplisit bahwa SPV adalah satu-satunya role yang berhak melakukan export weekly report.
- **Keputusan:**
  - Proteksi dilakukan di dua lapisan:
    1. UI: Tombol Export Report hanya dirender jika role user aktif adalah `SPV`.
    2. Server Action / API: Server memverifikasi permission `report.export_weekly`. Jika bukan role SPV, server menolak dengan kode 403 Forbidden.
  - Setiap kali ekspor dilakukan, fungsi langsung mencatat aktivitas ke tabel `audit_logs`.

---

## ADR-010: 100% Mobile-First Unified Application Architecture (Koreksi Platform)
- **Tanggal:** 2026-11-09
- **Konteks:** Arahan eksplisit pengguna menetapkan bahwa seluruh aplikasi The CEO Building Management System harus mobile-first untuk smartphone (Android & iOS). Tidak ada desktop-only layout atau sidebar horizontal. Kelima peran internal (Engineer, SPV, Manager, Accounting, Direksi) menggunakan aplikasi mobile yang sama.
- **Keputusan:**
  1. **Unified Mobile Shell:** Aplikasi dibungkus dalam container smartphone (`max-w-md w-full min-h-screen pb-20`) terpusat dengan safe area insets.
  2. **Role-Based Bottom Navigation:** Desktop sidebar dihapus permanen. Digantikan oleh bottom navigation bar 5 menu dinamis sesuai peran aktif di thumb zone.
  3. **Mobile-Friendly Cards:** Semua tabel horizontal lebar digantikan oleh kartu vertikal dengan visual hierarchy jelas, status badges, dan quick action touch targets.
  4. **Preservasi Business Logic:** Seluruh aturan bisnis, RBAC, skema database relasional, dan fase pengujian tetap dipertahankan tanpa perubahan.
