# AsyncStandup — Coldstart Document

**Status:** Approved | **Tanggal:** 28 Agustus 2026

---

## 1. Ide & Konsep

**Nama:** AsyncStandup (Asynchronous Daily Standup Tool)

**Masalah yang Diselesaikan:** Meeting harian (daily standup) secara live membuang waktu, mengganggu alur kerja (flow state), dan sulit untuk tim remote beda zona waktu.

**Fitur Utama (MVP):**

1. Automated Cron Prompt (Email)
2. Form Check-in Harian (3 pertanyaan dasar)
3. Dashboard Ringkasan Tim (Timeline View)
4. Blocker Alert & Tagging
5. Laporan Ringkasan via Email

---

## 2. PRD (Product Requirements Document)

### Masalah yang Diselesaikan

Daily standup meeting secara live (sync) menghabiskan waktu tim setiap hari, memutus _flow state_ saat coding/kerja fokus, dan sangat sulit dijadwalkan untuk tim remote yang tersebar di zona waktu berbeda (misalnya sebagian tim di WIB, sebagian di US/Eropa). Akibatnya, standup sering di-skip, jadi asal-asalan, atau memaksa sebagian anggota bangun/lembur di luar jam kerja normal mereka.

### Siapa Usernya

- **Primary user:** Anggota tim engineering/product remote (individual contributor) yang mengisi check-in harian.
- **Secondary user:** Team Lead / Manager / Scrum Master yang memantau progres tim dan blocker via dashboard.

**Target skala:** Tim kecil-menengah (5–20 orang). Channel utama adalah web app custom (Next.js, React, TypeScript, Tailwind CSS, PostgreSQL). Reminder check-in dikirim via Email, sedangkan pengisian check-in dilakukan langsung di web app.

### Fitur Utama (MVP) — diurutkan dari paling penting

1. **Form Check-in Harian (3 pertanyaan dasar)** — Inti dari produk. Pertanyaan default: (a) Apa yang dikerjakan kemarin? (b) Apa yang akan dikerjakan hari ini? (c) Ada blocker?
2. **Automated Cron Prompt via Email** — Reminder otomatis (cron job) dikirim ke email tiap user di jam yang dikonfigurasi per user/tim, berisi link langsung ke form check-in di web app.
3. **Dashboard Ringkasan Tim (Timeline View)** — Tempat Team Lead melihat siapa sudah/belum check-in dan progres tim dalam satu tampilan kronologis, menggantikan fungsi utama meeting live.
4. **Blocker Alert & Tagging** — Saat member menandai ada blocker, sistem langsung notifikasi ke Lead/channel terkait, supaya blocker tidak terkubur.
5. **Laporan Ringkasan via Email** — Rekap harian/mingguan otomatis dikirim ke Lead.

### Out of Scope (Fase Selanjutnya)

- Integrasi Slack / Microsoft Teams / Discord sebagai channel notifikasi
- Custom pertanyaan check-in per tim
- Analytics/insight mendalam (tren produktivitas, burndown otomatis, dsb.)
- Integrasi langsung ke Jira/Linear/Trello untuk auto-tarik task
- Mobile app native
- Multi-team / multi-workspace management dalam satu akun (satu user = satu tim)
- Fitur voice/video async standup

### Tech Stack (Semua Free Tier)

Web app dibangun dengan **Next.js, React, TypeScript, Tailwind CSS** (frontend + server-side).

| Komponen                   | Layanan                         | Free Tier                    |
| -------------------------- | ------------------------------- | ---------------------------- |
| Hosting                    | Vercel                          | Hobby plan                   |
| Database                   | Neon (PostgreSQL)               | Free plan                    |
| ORM                        | Prisma + `@prisma/adapter-neon` | Open-source, gratis          |
| Cron / scheduler           | cron-job.org                    | Gratis                       |
| Email (reminder & laporan) | Resend                          | ~3.000 email/bulan, 100/hari |
| Autentikasi                | NextAuth.js                     | Open-source, gratis          |

**Catatan skalabilitas:** Free tier di atas mencukupi untuk tim <20 orang di tahap MVP. Jika jumlah user bertambah signifikan, perlu evaluasi upgrade ke paid tier atau migrasi ke alternatif gratis lain.

---

## 2.1 Arsitektur Terkonfirmasi (28 Agustus 2026)

Keputusan teknis final yang disepakati sebelum memulai scaffolding:

| Keputusan                          | Pilihan                              | Alasan                                                                                                                           |
| ---------------------------------- | ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| Cron / scheduler reminder          | **cron-job.org** (external)          | Vercel Cron di Hobby terbatas 1×/hari, tidak presisi (±59 menit), dan **UTC-only** — tidak cukup untuk reminder per-zona waktu (WIB + CET). cron-job.org gratis, dukung per-IANA timezone & per-menit. Memanggil API route Next.js dengan header `cron_secret`. |
| Setiap API route cron wajib auth    | Validasi header `cron_secret`        | Route cron apa pun harus menolak request lain (verifikasi `401` tanpa token, `2xx` dengan token).                                |
| ORM / akses database               | **Prisma + `@prisma/adapter-neon`** | Type-safe, migrasi mudah, dukungan resmi Neon. Schema di seksi 6 tinggal diterjemahkan 1:1 ke `schema.prisma`.                   |
| Koneksi DB di serverless           | **Connection pooling** (Neon pooler) | `DATABASE_URL` = pooled, `DATABASE_URL_UNPOOLED` = direct (untuk `prisma migrate`). Menghindari habisnya koneksi dari Vercel Functions. |
| Reminder per-zona waktu            | Disimpan di `reminder_settings.timezone` (IANA, mis. `Asia/Jakarta`, `CET`) | cron-job.org schedule menembak endpoint tiap jam tertentu; handler menentukan user mana yang saat itu waktunya reminder berdasarkan timezone masing-masing. |

### Strategi cron reminder (detail)

Karena Hobby Vercel tidak bisa per-zone-waktu, gunakan **satu (atau beberapa) cron-job.org job** yang memanggil endpoint `/api/cron/checkin-reminder`. Job tersebut dijadwalkan cukup sering (mis. tiap 15–30 menit) sehingga handler bisa:

1. Query semua `reminder_settings` yang `is_active = true`.
2. Untuk tiap user, hitung waktu lokal sekarang via timezone-nya.
3. Jika waktu lokal cocok dengan `reminder_time` (dan belum check-in hari ini), kirim email Reminder via Resend.

Endpoint divalidasi dengan header `cron_secret` agar tidak bisa dipicu orang lain.

---

## 3. User Persona

**Nama:** Dimas Pratama
**Role:** Backend Engineer (Individual Contributor) di startup remote-first
**Lokasi & Zona Waktu:** Bandung, WIB — separuh tim lainnya ada di Eropa (CET)

**Konteks:** Dimas kerja di tim engineering yang 60% anggotanya remote lintas zona waktu. Selama ini standup dilakukan live jam 10 pagi WIB, yang berarti jam 4-5 pagi untuk rekan di Eropa. Akibatnya sering ada yang skip atau setengah hati ikut meeting.

**Kebutuhan:**

- Bisa update progres kerja tanpa harus hadir di meeting jam tertentu
- Ingin blocker-nya cepat terlihat oleh Team Lead tanpa harus japri manual
- Ingin proses check-in cepat (di bawah 2 menit), tidak mengganggu waktu coding

**Masalah Utama:** Dimas kehilangan waktu fokus tiap pagi karena harus standby untuk meeting, dan kalau dia sedang deep work lalu blocker muncul di luar jam standup, dia sering lupa menyampaikannya sampai keesokan harinya — sehingga blocker jadi terlambat ditangani.

---

## 4. User Flow

**Tujuan:** Dimas mengisi check-in harian dan blocker-nya langsung diketahui Team Lead.

| Langkah | Aksi User                                                     | Halaman yang Muncul                                                           |
| ------- | ------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| 1       | Dimas menerima email reminder pagi hari                       | Email inbox — email berisi ringkasan singkat + tombol "Isi Check-in Hari Ini" |
| 2       | Klik tombol di email                                          | Browser terbuka ke `/login` (kalau belum login)                               |
| 3       | Login (via NextAuth, email magic link atau OAuth)             | Halaman **Login**                                                             |
| 4       | Setelah login, otomatis diarahkan                             | Halaman **Check-in Form** (`/checkin`)                                        |
| 5       | Dimas isi 3 pertanyaan, tandai ada blocker + tag ke Team Lead | Masih di halaman **Check-in Form**, field khusus "Blocker" dengan toggle/tag  |
| 6       | Klik "Submit"                                                 | Redirect ke halaman **Konfirmasi** (`/checkin/success`)                       |
| 7       | (Otomatis, background) Sistem kirim notifikasi blocker        | Team Lead menerima email/notifikasi in-app berisi blocker Dimas               |
| 8       | Dimas klik "Lihat Tim" dari halaman konfirmasi (opsional)     | Halaman **Dashboard Timeline** (`/dashboard`)                                 |
| 9       | Selesai — Dimas kembali kerja                                 | (keluar dari app / tab ditutup)                                               |

**Titik akhir tujuan tercapai:** Blocker Dimas sudah tercatat dan Team Lead sudah menerima notifikasi — tanpa Dimas perlu hadir di meeting live.

---

## 5. Wireframe (Struktur Elemen)

### Halaman Login (`/login`)

1. Header — Logo "AsyncStandup"
2. Judul halaman — "Masuk ke akun Anda"
3. Form Login — Input Email, Tombol "Kirim Magic Link" (atau OAuth)
4. Teks bantuan — "Link login akan dikirim ke email Anda"
5. Footer

### Halaman Check-in Form (`/checkin`)

1. Header/Navbar — Logo, Nama user, Link "Lihat Tim"
2. Judul halaman — "Check-in Hari Ini — [tanggal]"
3. Form Check-in:
   - Textarea: "Apa yang dikerjakan kemarin?"
   - Textarea: "Apa yang dikerjakan hari ini?"
   - Textarea: "Ada blocker?"
   - Toggle "Tandai sebagai Blocker" → Dropdown "Tag ke" (kondisional)
4. Tombol Submit — "Submit Check-in"
5. Teks kecil status — "Terakhir check-in: kemarin 09:12"

### Halaman Konfirmasi (`/checkin/success`)

1. Header/Navbar
2. Icon sukses
3. Pesan konfirmasi — "Check-in tersimpan"
4. Ringkasan singkat (read-only)
5. Tombol "Lihat Tim"
6. Tombol sekunder "Kembali/Tutup" (opsional)

### Halaman Dashboard Timeline (`/dashboard`)

1. Header/Navbar
2. Judul halaman — "Ringkasan Tim — [tanggal]"
3. Filter/Selector tanggal
4. List Timeline Anggota Tim (per anggota): Nama, Status check-in, Ringkasan singkat, Badge "Blocker"
5. Section "Blocker Aktif" (terpisah, menonjol)
6. Tombol/Link "Lihat semua riwayat" (opsional)

---

## 6. Database Schema (PostgreSQL)

**Konvensi penamaan:** `snake_case` plural untuk tabel, PK `id` (UUID), FK `<tabel_singular>_id`.

### `teams`

| Kolom      | Tipe         | Keterangan |
| ---------- | ------------ | ---------- |
| id         | UUID         | PK         |
| name       | VARCHAR(255) |            |
| created_at | TIMESTAMP    |            |
| updated_at | TIMESTAMP    |            |

### `users`

| Kolom      | Tipe         | Keterangan                  |
| ---------- | ------------ | --------------------------- |
| id         | UUID         | PK                          |
| team_id    | UUID         | FK → teams.id               |
| name       | VARCHAR(255) |                             |
| email      | VARCHAR(255) | UNIQUE                      |
| role       | VARCHAR(20)  | CHECK IN ('member', 'lead') |
| created_at | TIMESTAMP    |                             |
| updated_at | TIMESTAMP    |                             |

### `checkins`

| Kolom            | Tipe      | Keterangan                     |
| ---------------- | --------- | ------------------------------ |
| id               | UUID      | PK                             |
| user_id          | UUID      | FK → users.id                  |
| team_id          | UUID      | FK → teams.id (denormalized)   |
| checkin_date     | DATE      |                                |
| yesterday_update | TEXT      |                                |
| today_plan       | TEXT      |                                |
| blocker_note     | TEXT      | Nullable                       |
| has_blocker      | BOOLEAN   | DEFAULT false                  |
| created_at       | TIMESTAMP |                                |
| —                |           | UNIQUE (user_id, checkin_date) |

### `blockers`

| Kolom       | Tipe        | Keterangan                                    |
| ----------- | ----------- | --------------------------------------------- |
| id          | UUID        | PK                                            |
| checkin_id  | UUID        | FK → checkins.id                              |
| reported_by | UUID        | FK → users.id                                 |
| tagged_to   | UUID        | FK → users.id, Nullable                       |
| status      | VARCHAR(20) | CHECK IN ('open', 'resolved'), DEFAULT 'open' |
| created_at  | TIMESTAMP   |                                               |
| resolved_at | TIMESTAMP   | Nullable                                      |

### `reminder_settings`

| Kolom         | Tipe        | Keterangan            |
| ------------- | ----------- | --------------------- |
| id            | UUID        | PK                    |
| user_id       | UUID        | FK → users.id, UNIQUE |
| reminder_time | VARCHAR(5)  | 'HH:MM' 24 jam. *Deviasi: dokumentasi awal menulis TIME, tapi Prisma tak mendukung String+TIME, jadi disimpan sebagai string 'HH:MM'.* |
| timezone      | VARCHAR(50) |                       |
| is_active     | BOOLEAN     | DEFAULT true          |
| created_at    | TIMESTAMP   |                       |
| updated_at    | TIMESTAMP   |                       |

### `notifications`

| Kolom              | Tipe        | Keterangan                                                       |
| ------------------ | ----------- | ---------------------------------------------------------------- |
| id                 | UUID        | PK                                                               |
| recipient_id       | UUID        | FK → users.id                                                    |
| type               | VARCHAR(30) | CHECK IN ('blocker_alert', 'checkin_reminder', 'summary_report') |
| related_checkin_id | UUID        | FK → checkins.id, Nullable                                       |
| related_blocker_id | UUID        | FK → blockers.id, Nullable                                       |
| message            | TEXT        |                                                                  |
| is_read            | BOOLEAN     | DEFAULT false                                                    |
| sent_at            | TIMESTAMP   |                                                                  |

### `summary_reports`

| Kolom        | Tipe        | Keterangan                   |
| ------------ | ----------- | ---------------------------- |
| id           | UUID        | PK                           |
| team_id      | UUID        | FK → teams.id                |
| recipient_id | UUID        | FK → users.id (Team Lead)    |
| report_type  | VARCHAR(10) | CHECK IN ('daily', 'weekly') |
| period_start | DATE        |                              |
| period_end   | DATE        |                              |
| content      | TEXT        |                              |
| generated_at | TIMESTAMP   |                              |

### Relasi Antar Tabel

- `teams` 1—N `users`
- `users` 1—N `checkins`
- `checkins` 1—0/1 `blockers`
- `users` 1—N `blockers` (via reported_by, tagged_to)
- `users` 1—1 `reminder_settings`
- `users` 1—N `notifications`
- `teams` 1—N `summary_reports`, `users` 1—N `summary_reports` (sebagai recipient_id)

---

## 7. Style & Mood Visual

**Mood:** Clean & Professional

### Palet Warna Utama

| Warna              | Hex                                       | Peran                                        |
| ------------------ | ----------------------------------------- | -------------------------------------------- |
| Deep Slate Blue    | `#1E3A5F`                                 | Primary (header, tombol utama, aksen navbar) |
| Neutral Slate Gray | `#475569` (teks) / `#F8FAFC` (background) | Base/neutral                                 |
| Signal Amber       | `#F59E0B`                                 | Accent/warning (badge blocker)               |

**Kontras:** `#1E3A5F` di atas `#F8FAFC` menghasilkan rasio kontras ±10:1, aman untuk teks maupun tombol (di atas standar WCAG AA 4.5:1). Amber dipakai terbatas untuk badge/ikon, bukan teks panjang.

### Referensi App dengan Mood Serupa

1. **Linear** — https://linear.app
2. **Notion** — https://notion.so
3. **Vercel Dashboard** — https://vercel.com

### Font

Font default system/Tailwind (`font-sans`) sudah cukup — bersih, native tiap OS, gratis, tanpa loading tambahan. Opsional upgrade ke **Inter** (Google Fonts, gratis) jika ingin karakter visual lebih kuat.

---

## 8. Log Perubahan & Status Implementasi

**Aturan:** Setiap keputusan, perubahan, dan progres implementasi dicatat di bagian ini secara kronologis (paling baru di atas).

### 28 Agustus 2026 — Fix error build Vercel (Prisma client tidak ter-generate)

**Status:** ✅ Root cause teratasi; `npm run build` (flow Vercel: prebuild → prisma generate → next build) lolos.

**Masalah:** Build Vercel gagal dengan `TS2305: '@prisma/client' has no exported member 'PrismaClient'` + rentetan `TS7006` (parameter `t`/`n`/`u`/`c` implicit any) di `onboarding.ts`, `reminders.ts`, `summary.ts`.

**Root cause:** Semua error itu **gejala dari satu akar masalah**: di lingkungan Vercel, **client Prisma tidak ter-generate** sebelum `next build` jalankan type-check. Karena `postinstall` hanya `prisma skills sync || exit 0` (bukan `prisma generate`), dan auto-generate `@prisma/client` kadang di-skip Vercel → `node_modules/.prisma/client` kosong → `PrismaClient` tidak diekspor (TS2305) → tipe semua model hilang → callback `.then((t)=>…)` / `.map((u)=>…)` jadi implicit any (TS7006). Build lokal lolos karena client sudah ter-generate lokal.

**Fix:** Tambah script **`"prebuild": "prisma generate"`** di `package.json`. npm/Vercel otomatis menjalankan `prebuild` sebelum `build`, sehingga client ter-generate dulu sebelum type-check.

**Verifikasi:** Hapus `node_modules/.prisma/client` (simulasi kondisi Vercel yang gagal) → `npm run prebuild` (generate v7.10.0) → `npx tsc --noEmit` = 0 error → `npm run build` (dgn client dihapus dulu) = ✅ lolos.

### 28 Agustus 2026 — Persiapan Deploy ke Vercel (siapkan env + petunjuk)

**Status:** ✅ Config & env siap; keputusan deploy-test disepakati (sender `onboarding@resend.dev`). Deploy dilakukan user ke Vercel.

**Keputusan / temuan:**
- **Pengirim email deploy-test:** tetap **`AsyncStandup <onboarding@resend.dev>`** — Resend free tier mengizinkan kirim ke *inbox tes* (`delivered@resend.dev`) tanpa verifikasi domain. Kirim ke inbox sungguhan (Gmail dll) **menunggu verifikasi domain**.
- **User belum punya domain sendiri.** Domain `*.vercel.app` **tidak bisa** dipakai sebagai sending domain Resend (Resend butuh tambah record SPF/DKIM/MX, dan Vercel tidak memberi akses edit DNS domain `.vercel.app`). → Verifikasi domain **ditunda**; utk produksi penuh disarankan beli domain murah (Niagahoster/Cloudflare/Namecheap) lalu verifikasi di dashboard Resend.
- **Env yang wajib diisi/diubah saat deploy** (di Vercel dashboard → Project → Settings → Environment Variables):
  - `DATABASE_URL` = **pooled** (runtime; sudah ada di `.env`).
  - `DATABASE_URL_UNPOOLED` = direct (dipakai `prisma.config.ts` utk `migrate deploy` saat build).
  - `AUTH_URL` = **ubah** dari `http://localhost:3000` → `https://<nama-app>.vercel.app` (dipakai utk URL magic-link & link `/checkin`,`/dashboard` di email cron — kalau dibiarkan `localhost`, link email jadi rusak).
  - `AUTH_SECRET` = sama dgn lokal (biar session konsisten) — generate `openssl rand -base64 32`.
  - `RESEND_API_KEY` = sama dgn lokal.
  - `RESEND_FROM_EMAIL` = `AsyncStandup <onboarding@resend.dev>`.
  - `CRON_SECRET` = sama dgn lokal (utk memvalidasi request `/api/cron/*` dari cron-job.org).
- `postinstall` di `package.json` = `prisma skills sync || exit 0` → tidak fatal; `npm install` di Vercel otomatis `prisma generate` dari `prisma/schema.prisma` yang ter-commit. Build sudah lolos lokal → diyakini lolos di Vercel.
- `prisma.config.ts` memakai `DATABASE_URL_UNPOOLED` (migrate), runtime memakai `DATABASE_URL` (pooled). Di Vercel, tambahkan `"prisma migrate deploy"` pada Build Command bila ingin auto-migrate saat deploy, ATAU jalankan migrate manual dari lokal (`npm run db:migrate`) terhadap DB Neon.

**Langkah setelah deploy (user):**
1. Import repo ke Vercel → set env di atas → deploy (Build Command default `next build`).
2. Buka URL produksi → verifikasi `/login`, `/checkin`, `/dashboard`.
3. Jalankan `prisma migrate deploy` (via Vercel Build atau manual utk DB Neon) agar tabel ada di DB.
4. Tes E2E cron di produksi: tempel URL `/api/cron/checkin-reminder` di cron-job.org (header `x-cron-secret` = `CRON_SECRET`, tiap 15–30 mnt) & `/api/cron/summary-report?type=daily` (daily) + `?type=weekly` (mingguan). Set `BASE_URL` cron ke URL produksi.
5. Bila ingin kirim ke inbox sungguhan: beli & verifikasi domain di Resend, lalu ubah `RESEND_FROM_EMAIL`.

### 28 Agustus 2026 — Verifikasi E2E Email Resend + refactor `sendEmail` ke fetch native

**Status:** ✅ Kunci `RESEND_API_KEY` valid & pengiriman email cron (reminder + summary) terverifikasi end-to-end via Resend.

**Yang dilakukan:**
- Mengisi **`RESEND_API_KEY`** di `.env` (user) + `RESEND_FROM_EMAIL="AsyncStandup <onboarding@resend.dev>"`. `AUTH_SECRET`, `CRON_SECRET` juga sudah terisi.
- **`src/lib/email.ts`** — **refactor: ganti SDK `resend` → fetch native** (`fetch("https://api.resend.com/emails")`, global fetch Node 18+/Vercel). Alasan: SDK `resend` di environment dev ini gagal konsisten (`request could not be resolved` / network), sedangkan fetch native terbukti stabil & mengembalikan ID email. API `sendEmail({to,subject,html,text})` → `{id}` dipertahankan (pemanggil di auth/reminder/summary tidak berubah). Dependensi npm `resend` dihapus (`npm uninstall resend`); build tetap lolos & tak ada import tersisa.

**Verifikasi (E2E melalui server sungguhan + kunci asli):**
- POST langsung ke `api.resend.com/emails` (curl) → HTTP 200 + email `id` (mis. `ec264256-...`) → **kunci valid**.
- fetch native (undici) POST → HTTP 200 + `id` (mis. `0d0a12f8-...`) → ekivalen dengan kode `email.ts`.
- **Reminder cron** (`/api/cron/checkin-reminder`) dengan seed user (email `delivered@resend.dev`, inbox tes Resend yang menerima tanpa verifikasi domain) → **`{ok:true,"sent":1}`** (email terkirim) lalu re-run → **`{ok:true,"sent":0}`** (dedup OK, tak ada email ganda).
- **Summary cron** (`/api/cron/summary-report`, daily) → **`{ok:true,"type":"daily","sent":1}`** (email ke lead).
- Build ✅ · lint ✅ · data tes dibersihkan.

**Keputusan / deviasi:**
- **Egress ke api.resend.com dari environment dev ini intermittent (flaky)** — kadang `ConnectTimeoutError`/`fetch failed` saat window buruk, kadang sukses. Hal yang sama juga terjadi pada SDK `resend` sebelumnya (bukan regresi dari refactor). Di **production Vercel**, egress normal & andal. Untuk verifikasi E2E di sini, endpoint cron di-retry sampai menangkap window yang baik.
- **Inbox tes `delivered@resend.dev`** dipakai sebagai penerima untuk membuktikan email benar-benar diterima Resend (domain `onboarding@resend.dev` belum diverifikasi, sehingga Resend hanya mengizinkan kirim ke inbox tes ini dari akun gratis). Untuk kirim ke penerima sungguhan di production, verifikasi domain di dashboard Resend.

**Belum selesai / langkah berikutnya:**
- **Magic-link login E2E penuh** butuh penerima sungguhan (buka email & klik link) — user harus punya inbox; alur `sendVerificationRequest` → `sendEmail` sudah memakai `email.ts` (terbukti kirim).
- Verifikasi domain Resend utk kirim ke inbox produksi (bukan `delivered@resend.dev`).
- Daftarkan 2 job di **cron-job.org** (header `x-cron-secret` = `CRON_SECRET`): `checkin-reminder` tiap 15–30 mnt + `summary-report` daily/weekly.
- Onboarding create/join team + role-based access.

### 28 Agustus 2026 — Cron Reminder & Summary Report

**Status:** ✅ Endpoint cron aman + logika reminder per-timezone + summary report, build + lint lolos, smoke test + verifikasi DB on.

**Yang dilakukan:**
- **`src/lib/cron.ts`** — helper auth utk semua route `/api/cron/*`: validasi header `x-cron-secret` vs `CRON_SECRET` (perbandingan timing-safe / constant-time). `401` tanpa/salah token, `2xx` dengan token benar.
- **`src/lib/dates.ts`** — `utcTodayDate()` & `addDays()`: seluruh app memakai "hari ini" berbasis UTC date (konsisten dengan cara `checkin_date` disimpan). Dipakai juga oleh checkin/page/success/dashboard (refactor kecil utk menghilangkan duplikasi inline).
- **`src/lib/reminders.ts`** — `runCheckinReminders(baseUrl)`: untuk tiap `reminder_settings` aktif, hitung jam:menit & tanggal lokal via `Intl` (timezone IANA). Jika waktu lokal sudah melewati `reminder_time` **&** user belum check-in hari ini **&** belum diingatkan hari ini → kirim email (via `sendEmail`) + catat `Notification` (`type=checkin_reminder`, `message=<tanggal lokal>` sebagai **marker dedup**).
- **`src/app/api/cron/checkin-reminder/route.ts`** (GET/POST) — validasi cron_secret, panggil `runCheckinReminders`, respons `{ok, sent}`. `baseUrl` dari `AUTH_URL`.
- **`src/lib/summary.ts`** — `runSummaryReports(type, baseUrl)`: rekap tiap team (daily = kemarin, weekly = 7 hari). Grup check-in per member, hitung blocker aktif, kirim email HTML ke tiap lead, simpan `SummaryReport` + `Notification` (`type=summary_report`).
- **`src/app/api/cron/summary-report/route.ts`** (GET/POST) — validasi cron_secret, terima `?type=daily|weekly` (default daily), panggil `runSummaryReports`.

**Keputusan / deviasi:**
- Header cron: **`x-cron-secret`** (bukan Authorization Bearer) — sederhana & sesuai "header cron_secret" di coldstart 2.1. Cassandra cron-job.org tinggal set header ini.
- **Dedup reminder** memakai tabel `Notification` (marker `message=<tanggal lokal user>`) — menghindari migrasi schema. Efek: dalam window polling 15–30 mnt, hanya job pertama setelah `reminder_time` yang mengirim; job berikutnya skip.
- **Summary** tidak memakai dedup: setiap panggilan cron membuat rekap baru (periode sama). Frequency dibatasi oleh jadwal cron-job.org (daily/weekly terpisah). Catatan: hindari menjadwalkan job summary lebih dari sekali per periode.
- "Hari ini" utk reminder & check-in memakai **UTC date** (bukan timezone lokal) — kompromi MVP agar konsisten dgn penyimpanan `checkin_date`; timezone user baru dipakai utk menentukan *waktu* reminder, bukan tanggal check-in.

**Verifikasi:**
- `npm run build` ✅ · `npm run lint` ✅ · kedua endpoint terdaftar (`/api/cron/checkin-reminder`, `/api/cron/summary-report`).
- Smoke cron auth: tanpa token → 401, token salah → 401, token benar → 200 `{ok:true}`.
- Tes E2E (seed data tes ke Neon → panggil endpoint): reminder `sent:1`, summary daily `sent:1`, re-run reminder → `sent:0` (**dedup OK**). Verifikasi DB: `Notification` checkin_reminder (marker tanggal), 2× `Notification`+`SummaryReport` summary dgn `periodStart`/`periodEnd` & `recipientId`=lead benar. Cleanup `CLEANUP_OK`.
- **Mail tengah skip** karena `RESEND_API_KEY` masih kosong (dev mode: log warning, tidak throw) — hasil akhir (Notification/SummaryReport) tetap tersimpan.

### 28 Agustus 2026 — Halaman Dashboard Timeline

**Status:** ✅ `/dashboard` terpasang, proteksi route aktif, build + lint lolos, smoke test + verifikasi DB on.

**Yang dilakukan:**
- **`src/app/dashboard/page.tsx`** (server) — per wireframe seksi 5: judul "Ringkasan Tim — [tanggal]" (format `id-ID`), filter tanggal via query param `?date=YYYY-MM-DD` (default hari ini), jumlah anggota tim. Pakai `requireUser()`. Ambil data via `Promise.all`: anggota tim (nama+role), check-in per tanggal, blocker open tim (dengan relasi `checkin`, `reporter`, `taggedUser`).
- **`src/components/dashboard/date-filter.tsx`** (client) — `<input type=date>` yang mengubah `?date=` query param (navigasi React, tanpa reload penuh).
- **`src/components/dashboard/team-timeline.tsx`** — list timeline per anggota: avatar (inisial), nama (+ badge "lead"), status check-in (badge hijau "Check-in ✓" / kuning "Blocker" / teks "Belum check-in"), ringkasan kemarin & hari ini, dan nota blocker.
- **`src/components/dashboard/active-blockers.tsx`** — section "Blocker Aktif" terpisah & menonjol (Signal Amber `#F59E0B`): siapa melapor → tag ke siapa, tanggal, dan detail blocker. Tidak tampil bila tak ada blocker open.

**Keputusan / deviasi:**
- Dashboard bisa diakses **semua** anggota tim (bukan cuma lead) — wireframe fokus ke lead, tapi info dasar tim berguna utk semua member. Batasan aksi (mis. resolve blocker) menunggu role-based access.
- "Lihat semua riwayat" (opsional, wireframe #6) **belum dibuat** — dihilangkan sementara agar tidak ada link mati; riwayat penuh bisa via filter tanggal.
- Blocker "Aktif" = `status='open'` di semua tanggal (bukan hanya tanggal terpilih) agar blocker yang belum terselesaikan selalu terlihat.

**Verifikasi:**
- `npm run build` ✅ · `npm run lint` ✅ · `/dashboard` redirect ke `/login` bila belum login (307) ✅.
- Script verifikasi DB (query dashboard via serverless driver ke Neon sungguhan): insert user tes + checkin + blocker, query members/checkins/open blockers → `QUERY_OK`, cleanup → `CLEANUP_OK` ✅. (Script `__verify.mjs` dibuat sementara lalu dihapus; meninggalkan "Tim Default" yang memang akan dibuat saat signup.)

### 28 Agustus 2026 — Halaman Check-in Form + Konfirmasi

**Status:** ✅ `/checkin` & `/checkin/success` terpasang, proteksi route aktif, build + lint lolos, smoke test on.

**Yang dilakukan:**
- **`src/app/checkin/page.tsx`** (server) — halaman check-in per wireframe seksi 5. Pakai `requireUser()` (redirect ke `/login` bila belum login). Judul "Check-in Hari Ini — [tanggal]" (format `id-ID`), status "Terakhir check-in: [waktu]", cek apakah sudah check-in hari ini, dan ambil daftar anggota tim untuk dropdown "Tag ke".
- **`src/components/checkin-form.tsx`** (client) — 3 textarea (kemarin / hari ini / blocker), toggle "Tandai sebagai Blocker" (state-driven, munculkan field blocker + dropdown "Tag ke"), pakai `useActionState` + `SubmitButton` (`useFormStatus` untuk pending).
- **`src/app/checkin/actions.ts`** (server action `submitCheckin`) — validasi app-layer; **upsert** `checkin` (UNIQUE `userId+checkinDate` → update bila sudah check-in hari ini), insert `blocker` bila `has_blocker` + nota terisi. Punya **retry** (max 2×) karena driver serverless Neon flaky. Redirect ke `/checkin/success`.
- **`src/components/navbar.tsx`** — navbar reusable: logo, nama user, link "Lihat Tim" (`/dashboard`).
- **`src/components/submit-button.tsx`** — tombol dengan pending state.
- **`src/app/checkin/success/page.tsx`** (server) — halaman konfirmasi sesuai wireframe: icon sukses, "Check-in tersimpan", ringkasan read-only dari DB, tombol "Lihat Tim" (`/dashboard`) & "Kembali".
- **`src/lib/onboarding.ts` + override `createUser` di `src/auth.ts`** — perbaiki signup: kolom `teamId` & `role` di schema non-null tanpa default, sedangkan NextAuth hanya kirim name/email/emailVerified/image. Override `createUser` memberi fallback `teamId` (default team "Tim Default", dibuat lazily) + `role "member"` agar user baru bisa login.

**Keputusan / deviasi:**
- **Onboarding sementara:** hingga flow create/join team dibangun, semua user baru masuk **default team "Tim Default"** + role `member`. (Perlu diganti saat onboarding dibangun.)
- Check-in hari ini **bisa diperbarui** (upsert berdasarkan `user_id + checkin_date`) — wireframe menyiratkan sekali per hari, tapi edit idempotent dipilih agar link email/coba-ulang tidak error.
- `/dashboard` belum ada — link "Lihat Tim" akan 404 sampai dashboard dibangun (tahap berikutnya).

### 28 Agustus 2026 — Implementasi Auth (NextAuth v5) + halaman login

**Status:** ✅ Auth & login page terpasang, build + lint lolos, smoke test on.

**Yang dilakukan:**
- Instal **NextAuth v5** (`next-auth@5.0.0-beta.32`, beta) + **`@auth/prisma-adapter@2.11.3`** + `nodemailer`.
- File baru **`src/auth.ts`** — `NextAuth({ adapter: PrismaAdapter(prisma), session: { strategy: "jwt" }, ... })` dengan provider **Nodemailer** (magic link). `sendVerificationRequest` di-override untuk kirim via **Resend** (helper `src/lib/email.ts`).
- Route handler **`src/app/api/auth/[...nextauth]/route.ts`** → re-export `GET`/`POST` dari `@/auth`.
- **`src/lib/email.ts`** — wrapper Resend. Instansiasi Resend dibuat **lazy** agar tidak throw build saat `RESEND_API_KEY` masih kosong; di dev tanpa key hanya log warning (tidak mengirim).
- **`src/lib/dal.ts`** — Data Access Layer: `getCurrentUser()` + `requireUser()` (redirect ke `/login`). Pola proteksi route rekomendasi Next.js 16 (verifikasi sedekat sumber data, bukan cuma proxy).
- **`src/app/login/page.tsx`** (server) + **`src/components/login-form.tsx`** (client) — form email → magic link, sesuai wireframe seksi 5 & palet seksi 7 (`#1E3A5F` primary).
- **`src/app/page.tsx`** (root `/`) diganti: redirect → `/checkin` bila sudah login, else `/login`. Prototype create-next-app dihapus.
- Metadata root layout: `lang="id"`, judul "AsyncStandup".

**Keputusan / deviasi:**
- Tidak pakai `middleware.ts`/`proxy.ts` untuk proteksi route — NextAuth v5 + Next 16 punya ambiguitas penamaan; dipilih **DAL + per-halaman check** (lebih aman, pola resmi Next 16). Mekanisme siap dipakai oleh halaman checkin/dashboard tahap berikutnya.
- Session strategy **JWT** (bukan database session), walau pakai DB adapter untuk magic-link (adapter tetap dibutuhkan Email provider).

**Belum selesai di scope ini:**
- `RESEND_API_KEY` belum diisi (user) → magic link belum benar-benar terkirim (dev otomatis skip).
- Penetapan `role`/`teamId` saat signup (user baru) — `User` saat ini butuh `teamId`; keputusan menunggu tahap onboarding/team.
- Halaman `/checkin` & `/dashboard` (proteksinya sudah siap via `requireUser`).

### 28 Agustus 2026 — Migrasi database Neon selesai (tabel dibuat)

**Status:** ✅ Database aktif & tabel ter-create di Neon.

**Yang dilakukan:**
- User mengisi kredensial Neon di `.env` (`DATABASE_URL` pooled → `ep-hidden-credit-...-pooler`).
- `prisma migrate dev --name init` → migration `20260828034535_init` dibuat & diterapkan.
- Verifikasi: 7 tabel ter-create di schema `public` — `Team`, `User`, `Checkin`, `Blocker`, `ReminderSetting`, `Notification`, `SummaryReport` (+ `_prisma_migrations`).
- `prisma/migrations/20260828034535_init/migration.sql` tersimpan di repo untuk versioning & deploy.

**Temuan konektivitas (penting):**
- Environment dev ini **tidak bisa menjangkau endpoint Neon via TCP `:5432`** (port terblokir). Prisma CLI (`migrate`/`db push`/`migrate status`) butuh TCP 5432 → tidak andal dijalankan dari sini.
- Runtime app pakai **driver serverless** `@neondatabase/serverless` (HTTP/WebSocket), yang **tidak butuh TCP 5432** → koneksi ke Neon dari app tetap berfungsi (kadang fluktuatif).
- Akibat: `prisma migrate` / `db push` / `migrate status` sebaiknya dijalankan dari environment yang punya akses TCP ke Neon (mis. **Vercel build** pakai `DATABASE_URL_UNPOOLED`, atau lokal dengan jaringan yang bisa akses Neon).

**Keputusan DB:**
- `DATABASE_URL_UNPOOLED` diisi nilaaa **pooled** (`-pooler`) karena host direct tidak reachable via TCP dari sini. Di production/Vercel, set `DATABASE_URL_UNPOOLED` ke *direct* connection dari dashboard Neon jika ingin migrate via build.

### 28 Agustus 2026 — Scaffolding project + setup Prisma/Neon

**Keputusan arsitektur final** (lihat seksi 2.1): cron-job.org, Prisma + `@prisma/adapter-neon`.

**Yang sudah dilakukan:**
- Scaffold project Next.js 16.3.3 + TypeScript + Tailwind CSS v4 di repo ini (create-next-app, App Router, `src/` dir, import alias `@/*`).
- Instal **Prisma 7.10.0** (stable, bukan RC) + `@prisma/client` + `@prisma/adapter-neon` + `@neondatabase/serverless`.
- Buat `prisma/schema.prisma` — terjemahan 1:1 schema seksi 6 (model: `Team`, `User`, `Checkin`, `Blocker`, `ReminderSetting`, `Notification`, `SummaryReport`).
- `prisma.config.ts` untuk Prisma 7: datasource pakai `DATABASE_URL_UNPOOLED` (untuk migrate), migrasi di `prisma/migrations`.
- `src/lib/prisma.ts` — PrismaClient singleton + Neon adapter (pakai `DATABASE_URL` *pooled*).
- `.env.example` (template yang di-commit) + `.env` lokal (gitignored).
- Script npm: `db:generate`, `db:push`, `db:migrate`, `db:deploy`, `db:studio`.
- `npm run build` ✅ lolos.

**Deviasi dari dokumen awal:**
- `reminder_settings.reminder_time`: `TIME` → `VARCHAR(5)` `'HH:MM'` (alasan: Prisma tak mendukung native `TIME` pada field String).
- Check constraint (`role`, `status`, `type`, `report_type`) divalidasi di **app layer** karena Prisma tidak punya CHECK constraint native (dicatat sebagai komentar di schema).

**Belum dilakukan (butuh input / deployment):**
- **Resend**: `RESEND_API_KEY` dari user → verifikasi E2E magic-link & pengiriman email cron beneran (saat ini dev-skip).
- **cron-job.org**: daftarkan 2 job (checkin-reminder tiap 15–30 mnt + summary-report daily/weekly) dgn header `x-cron-secret` = `CRON_SECRET` — setup eksternal, endpoint sudah siap.
- Onboarding create/join team (saat ini semua user baru masuk "Tim Default") + role-based access (mis. resolve blocker khusus lead).
- UI lanjutan (opsional per wireframe): "Lihat semua riwayat", blocker management (resolve), setting reminder per user.
