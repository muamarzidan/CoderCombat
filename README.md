# CoderCombat - Platform Duel Kuis 1v1

Web Development INSYFEST 2026

## Struktur Project

```
CoderCombat/
├── app/          # Frontend Vite + React Router v7
├── server/       # Backend Express + Socket.io
├── shared/       # Shared types (TS)
├── content/      # JSON modul kuis (12 modul)
└── supabase/     # Migration SQL
```

## Tech Stack

- **Frontend**: Vite, React 18, React Router v7, Tailwind CSS v3, Zustand, Socket.io-client
- **Backend**: Express, Socket.io, Supabase Auth
- **Database**: Supabase PostgreSQL
- **Font**: Pixelify Sans (HUD/display) + Atkinson Hyperlegible (body)

## Setup Day 1 (Auth Scaffold)

### 1. Install Dependencies

```bash
cd CoderCombat
pnpm install
```

### 2. Buat Supabase Project

1. Kunjungi https://supabase.com → Sign up gratis
2. Create new project → tunggu ~2 menit provisioning
3. Catat credentials dari **Settings → API**:
   - Project URL (format: `https://<project-id>.supabase.co`)
   - `anon` public key (untuk frontend)
   - `service_role` secret key (untuk backend)

### 3. Apply Database Migration

1. Buka **Supabase Dashboard → SQL Editor**
2. Klik "+ New query"
3. Copy-paste seluruh isi file `supabase/migrations/001_initial.sql`
4. Klik **Run** (atau Ctrl+Enter)
5. Verifikasi: buka **Table Editor** → harus ada tabel `profiles` dan `matches`

### 4. Konfigurasi Environment Variables

**Frontend** (`app/.env`):
```bash
VITE_SUPABASE_URL=https://project-id.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...
VITE_SOCKET_URL=http://localhost:3001
```

**Backend** (`server/.env`):
```bash
SUPABASE_URL=https://project-id.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGc...
PORT=3001
NODE_ENV=development
```

### 5. Disable Email Confirmation (Development)

Supabase Dashboard → **Authentication → Providers → Email**:

### 6. Start Development Servers

**Backend** (terminal 1):
```bash
cd server
pnpm dev
# Output: "Server running on port 3001"
```

**Frontend** (terminal 2):
```bash
cd app
pnpm dev
# Output: "Local: http://localhost:5173/"
```

### 7. Smoke Test

1. Buka browser → `http://localhost:5173`
2. Klik **Daftar**:
   - Username: `ninja123`
   - Email: `ninja@test.id`
   - Password: `rahasia123`
   - Submit → redirect otomatis ke `/modul`
3. Logout (klik ikon user di navbar → Keluar)
4. Klik **Masuk**:
   - Identifier: `ninja123` (username, bukan email)
   - Password: `rahasia123`
   - Submit → redirect ke `/modul`
5. Verifikasi guard: akses `/peringkat` → harus tampil data leaderboard kosong


## Aturan Duel

- 5 soal per duel, HP masing-masing 100
- Jawaban benar tercepat: -20 HP lawan
- Timer 15 detik per soal
- FIFO matchmaking: bot ditawarkan setelah 30 detik menunggu
- Win condition: HP lawan 0, soal habis, atau lawan disconnect (grace 8 detik)

## Troubleshooting

**Frontend tidak connect ke backend**:
- Cek `VITE_SOCKET_URL` di `app/.env` sudah benar (default: `http://localhost:3001`)
- Cek backend jalan di port 3001: `curl http://localhost:3001/health`

**Auth gagal (401)**:
- Cek `SUPABASE_URL` dan `SUPABASE_SERVICE_KEY` di `server/.env`
- Cek RLS policies: `profiles` SELECT publik, UPDATE restricted
- Cek email confirmation di Supabase Dashboard → Auth → Providers → **OFF**

**TypeScript errors**:
```bash
cd app && pnpm exec tsc --noEmit
cd server && pnpm exec tsc --noEmit
```

**Port 5173 sudah terpakai**:
Vite otomatis cari port lain (5174, 5175, dst). Update `VITE_SOCKET_URL` jika perlu.

## License

Web Development INSYFEST 2026 - Educational use only - Muamar Zidan Tri Antoro
