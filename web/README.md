# Memforme web (Phase 4)

Minimal Next.js 15 scaffold for a future dashboard.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open http://localhost:3005

Implement Supabase Auth and data views when the MCP + ChatGPT path is stable. Storage access for `user-memory` is governed by `003_storage_rls_user_memory.sql` (apply in Supabase after the bucket exists).
