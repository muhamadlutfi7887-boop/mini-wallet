# Mini Wallet API & Dashboard

Take Home Test Full Stack Web Development: dompet digital sederhana dengan autentikasi, top-up, transfer antar user, dan riwayat mutasi.

**Tech stack:** Node.js + Express 5, MySQL (`mysql2`), JWT (httpOnly cookie), bcrypt, React 18 + Vite.

## Cara menjalankan

Prasyarat: Node.js 20+ dan MySQL 8 (atau MariaDB 10.6+).

` ` `bash
# 1. Database
mysql -u root -p < backend/schema.sql

# 2. Backend
cd backend
cp .env.example .env        # isi DB_PASSWORD dan JWT_SECRET
npm install
npm run dev                 # http://localhost:5000

# 3. Frontend (terminal baru)
cd frontend
npm install
npm run dev                 # http://localhost:5173
` ` `

Generate `JWT_SECRET`: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`

Test: `npm test` (unit test validasi, tanpa DB) dan `npm run test:integration` (butuh MySQL; menguji seluruh alur API, rollback, dan transfer paralel).

## ERD

` ` `mermaid
erDiagram
  users ||--o{ transactions : "sender_id (nullable untuk top-up)"
  users ||--o{ transactions : "receiver_id"
  users {
    int id PK
    varchar username UK
    varchar email UK
    varchar phone UK "nullable"
    varchar password_hash
    bigint_unsigned balance "Rupiah bulat"
    timestamp created_at
  }
  transactions {
    bigint id PK
    enum type "topup | transfer"
    int sender_id FK "NULL jika topup"
    int receiver_id FK
    bigint_unsigned amount
    timestamp created_at
  }
` ` `

## Endpoint

Semua response: `{ success, message, data?, errors? }`. Endpoint bertanda 🔒 butuh login (cookie `token`, atau header `Authorization: Bearer <token>` untuk Postman).

| Method | Path | Keterangan |
|---|---|---|
| POST | `/api/auth/register` | `username, email, password, phone?` -> 201 |
| POST | `/api/auth/login` | `email, password` -> JWT di httpOnly cookie (+ di body untuk Postman) |
| POST | `/api/auth/logout` | hapus cookie |
| GET | `/api/auth/me` 🔒 | user yang sedang login |
| GET | `/api/wallet` 🔒 | saldo saat ini |
| POST | `/api/topup` 🔒 | `amount` |
| POST | `/api/transfer` 🔒 | `recipient` (email / nomor HP), `amount` |
| GET | `/api/transactions` 🔒 | riwayat. Query: `type=all\|in\|out\|topup\|transfer`, `page`, `limit` |

## Validasi & pesan error

| Input | Hasil |
|---|---|
| Email tanpa format valid (`user@`) | 422 `Format email tidak valid.` |
| Password < 8 karakter | 422 `Password minimal 8 karakter.` |
| Username sudah dipakai | 422 `Username sudah digunakan.` |
| Nominal kosong `""` | 422 `Nominal tidak boleh kosong.` |
| Nominal huruf / simbol (`abc`, `10@#`) | 422 `Nominal harus berupa angka.` |
| Top-up negatif | 422 `Top-up tidak boleh angka negatif.` |
| Nominal desimal (`1.5`) | 422 `Nominal harus berupa bilangan bulat.` |
| Nominal 0 | 422 `Nominal harus lebih dari 0.` |
| Nominal > batas (default Rp 10.000.000) | 422 `Nominal melebihi batas maksimum transaksi.` |
| Saldo tidak cukup | 400 `Saldo tidak cukup.` |
| Transfer ke diri sendiri | 400 |
| JSON rusak | 400 |
| Belum login / token salah / kedaluwarsa | 401 |
| Email atau password salah | 401 |

Batas maksimum diatur lewat `MAX_TRANSACTION_AMOUNT` di `.env`.

## Keputusan teknis

- **Database transaction + row locking.** Transfer berjalan dalam satu transaction. Baris saldo pengirim dan penerima dikunci dengan `SELECT ... FOR UPDATE`, selalu berurutan berdasarkan id agar transfer A->B dan B->A bersamaan tidak deadlock. Jika ada query yang gagal, semuanya di-rollback.
- **Saldo `BIGINT UNSIGNED`.** Rupiah bulat, tanpa float sehingga tidak ada selisih pembulatan. `UNSIGNED` jadi lapisan pengaman terakhir: MySQL menolak saldo yang akan minus.
- **Token di httpOnly cookie.** JavaScript (termasuk script XSS) tidak bisa membaca token. Frontend memakai `credentials: 'include'` dan memulihkan sesi lewat `GET /api/auth/me`. Cookie memakai `SameSite` + CORS dibatasi ke `CLIENT_ORIGIN`.
- **Isolasi data.** Query riwayat selalu memakai id dari JWT, bukan dari parameter request, sehingga User A tidak bisa membaca mutasi User B.
- **Hardening lain.** `helmet`, rate limit pada login/register, bcrypt, limit body 10 KB, pesan login yang tidak membocorkan apakah email terdaftar.
- **Frontend.** Tombol submit nonaktif sampai input valid, input tidak valid tidak dikirim ke server, tombol dikunci saat loading (`useRef` + `disabled`) sehingga klik beruntun hanya menghasilkan satu request, dan error API (mis. "Saldo tidak cukup.") tampil di form.

## Deploy

- **Backend** (Railway/Render): set semua variabel `.env`, `NODE_ENV=production`, `CLIENT_ORIGIN=<url frontend>`.
- **Frontend** (Vercel/Netlify): set `VITE_API_URL=<url backend>`, build `npm run build`.
- Jika frontend dan backend beda domain, set `COOKIE_SAMESITE=none` di backend (cookie otomatis `Secure`, wajib HTTPS).

## Struktur

` ` `text
backend/
  schema.sql
  src/
    app.js, server.js, config.js, db.js   # setup, koneksi, withTransaction()
    routes.js                             # daftar endpoint
    controllers/                          # validasi input + bentuk response
    services/                             # logika bisnis & query SQL
    middleware.js, validators.js, errors.js
  test/
frontend/src/
  api.js, utils.js, App.jsx
  components/  Login, Dashboard, TransactionForm, History, Field
` ` `# mini-wallet
