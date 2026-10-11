# Our Little LA Guide ♡

A romantic, mobile-first Next.js trip planner for October 23–November 1, 2026. Includes a single shared password, signed HTTP-only session cookie, add/edit/delete itinerary cards, photo-by-URL display, links, time, location, notes, search, and installable PWA metadata.

## 1. Requirements
- Node.js 20.9 or newer
- A Supabase project (free tier is enough for a small personal planner)
- A Vercel account or another host that supports Next.js

## 2. Set up the database
1. Create a project at https://supabase.com.
2. Open **SQL Editor** and run:

```sql
create table if not exists public.plans (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  title text not null,
  description text not null default '',
  time text not null default '',
  location text not null default '',
  link text not null default '',
  image_url text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now()
);

alter table public.plans enable row level security;
-- The app accesses this table only through its server-side service-role key.
-- Do not add a public/anon policy for this table.
```

3. In **Project Settings → API**, copy the Project URL and the `service_role` key. Keep that key private; never put it in a `NEXT_PUBLIC_` variable.

## 3. Configure the app
In the project folder, create `.env.local` (copy `.env.example`) and fill in:

```env
SITE_PASSWORD=choose-your-own-shared-password
SESSION_SECRET=paste-a-long-random-secret-here
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

Generate a strong session secret with one of these commands:
- macOS/Linux: `openssl rand -base64 48`
- Windows PowerShell: `-join ((1..64) | ForEach-Object { '{0:x}' -f (Get-Random -Maximum 16) })`

Use your own password. Anyone you share it with can add, edit, or delete plans. Login sessions last 14 days unless the user locks the planner or clears cookies.

## 4. Run locally
```bash
npm install
npm run dev
```
Open http://localhost:3000. The login screen appears first. The site needs the Supabase environment variables to load/save plans.

## 5. Deploy
1. Push the folder to a private GitHub repository.
2. Import it into Vercel.
3. Add all four environment variables from `.env.local` in Vercel's Project Settings → Environment Variables.
4. Deploy. Use the resulting HTTPS URL on both phones.

## 6. Add it to an iPhone Home Screen
After deployment, open the HTTPS site in **Safari** → Share → **Add to Home Screen** → Add. The included manifest and SVG icon provide app-like presentation. The site needs to be deployed to a real URL first. `appleWebApp` metadata is included; for a custom iOS home-screen image, replace/add `public/apple-touch-icon.png` (180×180 PNG).

## Photos and links
The photo field currently accepts a **direct image URL** (not a file upload). Use an image URL ending in an image format or a host that allows direct image embedding. Links should include `https://`. If you want uploads from the phone's camera roll, that can be added with a Supabase Storage bucket.

## Security notes
- Password verification is server-side; a signed, HTTP-only cookie represents the login session.
- The Supabase service-role key is only used by server-side route handlers. Keep it out of browser code and source control.
- The middleware uses cookie presence for early redirects; every data API separately verifies the signature and expiry.
- This is a shared-password private planner, not a multi-user account system. Anyone with the shared password has full editing rights.
