# POC (React + Vite) â€” Supabase Backend

This app uses **Supabase** for:

- **Auth** (Email/Password signup + login)
- **Profiles** (store `full_name` + `avatar_url`)
- **Storage** (upload avatar images)

## 1) Environment variables

Create a `.env` file in the project root:

```bash
VITE_SUPABASE_URL="https://YOUR_PROJECT_REF.supabase.co"
VITE_SUPABASE_ANON_KEY="YOUR_SUPABASE_ANON_KEY"
```

Example template: `.env.example`

## 2) Install dependency

```bash
npm install
```

Supabase client library is included in `package.json` as `@supabase/supabase-js`.

## 3) Supabase client

The Supabase client is created in:

- `src/services/supabaseClient.js`

## 4) Auth: signup + login

Auth calls live in:

- `src/services/authService.js`

### Signup

- Uses `supabase.auth.signUp({ email, password, options: { data: { full_name }}})`
- `full_name` is stored in **Auth user metadata** (`raw_user_meta_data.full_name`)
- If email confirmation is enabled in Supabase, signup may return **no session** until the user confirms email

### Login

- Uses `supabase.auth.signInWithPassword({ email, password })`

### Redux/Auth context integration

- Redux slice: `src/redux/reducers/authSlice.js`
- Context hook: `src/context/AuthContext.jsx`, `src/hooks/useAuth.js`

The app stores a minimal session payload in `localStorage`/`sessionStorage` and also seeds the Supabase client session on restore.

## 5) Profiles table (database)

The app reads/writes a `profiles` table (recommended) to store:

- `full_name`
- `avatar_url`

Create the table + RLS policies:

```sql
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own"
on public.profiles
for select
using (auth.uid() = id);

create policy "profiles_insert_own"
on public.profiles
for insert
with check (auth.uid() = id);

create policy "profiles_update_own"
on public.profiles
for update
using (auth.uid() = id)
with check (auth.uid() = id);
```

## 6) Avatar uploads (Supabase Storage)

The profile page uploads to a Storage bucket named:

- `avatars`

Upload logic lives in:

- `src/services/profileService.js` (`uploadAvatarAndGetUrl`)

### Create bucket

In Supabase Dashboard:

- **Storage â†’ Buckets â†’ New bucket**
- Name: `avatars`
- For simplest setup, make it **public** (app uses `getPublicUrl()`).

### Storage policies (RLS)

Run this in Supabase **SQL Editor** to allow:

- Public read for objects in `avatars`
- Authenticated users can upload/update files inside their own folder: `<uid>/...`

```sql
create policy "avatars_public_read"
on storage.objects for select
using (bucket_id = 'avatars');

create policy "avatars_upload_own"
on storage.objects for insert
with check (
  bucket_id = 'avatars'
  and auth.role() = 'authenticated'
  and name like (auth.uid()::text || '/%')
);

create policy "avatars_update_own"
on storage.objects for update
using (
  bucket_id = 'avatars'
  and auth.role() = 'authenticated'
  and name like (auth.uid()::text || '/%')
)
with check (
  bucket_id = 'avatars'
  and auth.role() = 'authenticated'
  and name like (auth.uid()::text || '/%')
);
```

## 7) Profile page: update name + avatar

Route:

- `/profile`

Frontend:

- `src/pages/Profile.jsx`

Backend calls:

- `src/services/profileService.js`

When saving:

- Avatar image is uploaded to Storage: `avatars/<uid>/avatar.<ext>`
- `profiles` table is upserted with `full_name` and `avatar_url`
- Auth user metadata is updated best-effort (optional sync)

## Run locally

```bash
npm run dev
```
