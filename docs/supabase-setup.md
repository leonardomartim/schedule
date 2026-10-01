# Account and event setup

The frontend supports Google OAuth, username/email and password sign-in, email-confirmed registration, three-question onboarding, and searches over an owner-managed Supabase event catalog. Two SQL migrations and one Edge Function must be deployed before enabling the new frontend in production.

## 1. Public frontend settings

This repository includes this Schedule project's public URL and publishable key in `src/account/supabase-configuration.ts`, so Vercel builds work without a local `.env` file. These browser credentials do not grant administrative access; database access remains protected by RLS.

To use a different project, set **both** values in Vercel → Project Settings → Environment Variables for the environments you deploy:

```dotenv
VITE_SUPABASE_URL=https://opxcfxpdslvexjfzqbjm.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<the project's public publishable key>
```

The project hostname ends in `.supabase.co`, not `.supabase.com`. A legacy `VITE_SUPABASE_ANON_KEY` is also supported. These variables are embedded at **build time**; redeploy after changing them. Never use a service-role key, secret API key, database password, or Google client secret in a `VITE_` variable.

Local development can override the defaults with `.env.local`, which is ignored by Git. For a different project, copy `.env.example` to `.env.local` and fill in its URL and public key. A partial override is rejected to avoid mixing credentials from different projects. Both the Auth client and Google provider check use the same resolved configuration.

## 2. Apply the database migrations

With the Supabase CLI authenticated to the project:

```sh
npx supabase login
npx supabase link --project-ref opxcfxpdslvexjfzqbjm
npx supabase db push
```

Alternatively, run the full contents of these files in the project's SQL Editor, in order, once each:

1. `supabase/migrations/202609210001_accounts_and_events.sql`
2. `supabase/migrations/202609210002_username_login_limits.sql`

The first migration adds profiles, the account-creation trigger, the event catalog, and the nearby search RPC. Existing accounts receive profiles and will be asked for preferences on their next sign-in. New password accounts require a unique, case-insensitive username of 3–24 letters, numbers, or underscores. Google profiles use the Google display name; they do not require a separate username.

Profiles are private to their owner. Clients may update only their own preferences. Catalog entries are visible to signed-in users only when published and still upcoming. Only the owner through the dashboard, or a trusted server, can create or modify catalog entries. No emails are stored in the public profile table.

The second migration adds a private rate-limit table. Only the Edge Function's server role may consume login attempts: 10 per username and 60 per IP in a 10-minute window. Stored identifiers are hashes; expired buckets are cleaned during subsequent attempts.

## 3. Deploy username sign-in

```sh
npx supabase functions deploy username-sign-in --project-ref opxcfxpdslvexjfzqbjm
npx supabase secrets set ALLOWED_ORIGINS=https://schedule-omega-ecru.vercel.app,http://localhost:5173,http://127.0.0.1:5173 --project-ref opxcfxpdslvexjfzqbjm
```

Supabase supplies `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` inside the function. Keep these server credentials out of the frontend. This endpoint intentionally allows signed-out requests (`verify_jwt = false`), then rate-limits and verifies the submitted password with Supabase Auth. It never returns the username's email address. Email/password sign-in uses Supabase Auth directly.

Only allow the production domain in `ALLOWED_ORIGINS` when local username testing is no longer needed. Include an exact Vercel preview origin if testing there.

## 4. Configure authentication redirects and Google

In Authentication → URL Configuration:

- Site URL: `https://schedule-omega-ecru.vercel.app/`
- Allowed redirect URLs: the site URL and `http://localhost:5173/`, `http://127.0.0.1:5173/` for development. Add exact preview URLs as needed.

Keep email confirmation enabled. After registration, users confirm their email and are sent through onboarding before entering the workspace. OAuth uses PKCE; open confirmation links in the same browser used to register.

To enable Google, create a Google OAuth web client and enter its client ID and secret under Authentication → Sign In / Providers → Google. Configure the Google client with:

- Authorized JavaScript origin: `https://schedule-omega-ecru.vercel.app`
- Authorized redirect URI: `https://opxcfxpdslvexjfzqbjm.supabase.co/auth/v1/callback`

See [Supabase Google setup](https://supabase.com/docs/guides/auth/social-login/auth-google) and [redirect configuration](https://supabase.com/docs/guides/auth/redirect-urls).

If clicking Google returns `Unsupported provider: provider is not enabled`, enable and save the Google provider in this project's dashboard. The public publishable key cannot enable OAuth providers. The app checks the project's public Auth settings before redirecting and displays an in-page error when Google is disabled or the check fails. It checks again on each attempt, so enabling Google does not require rebuilding the frontend. Deploying this error-handling change does require a frontend redeployment.

## 5. Populate the event catalog

Use Supabase Table Editor → `public.events` to enter verified real events, or import a CSV with these columns:

| Column | Value |
| --- | --- |
| `title`, `description` | Event name and summary |
| `category` | `music`, `arts`, `food`, `outdoors`, `technology`, or `sports` |
| `starts_at` | An ISO timestamp **with timezone**, e.g. `2027-02-20T19:00:00-03:00` |
| `venue`, `city` | Venue and city name |
| `latitude`, `longitude` | Venue coordinates in decimal degrees |
| `price` | Minimum ticket price; `0` means free; leave null if unknown |
| `currency` | Three-letter currency code, e.g. `BRL` |
| `url` | Optional official event URL beginning with `https://` |
| `published` | Set `true` when ready to appear in search |

`id` and `created_at` are generated automatically. No invented events are seeded. An empty catalog produces an honest empty state.

Location searches use a 1–100 km radius and precise distance calculation. City searches match the entire city name case-insensitively, without a radius. Names in different countries can coincide, so use location search for precise nearby results. Keywords match literal text in the title, description, venue, or category. Preferences give matching interests first priority and the selected budget second priority; start date breaks ties. The top 100 results are returned. Event times display in the viewer's timezone, with its abbreviation.

Coordinates are requested only after clicking **Use my location** and are sent to the project's search RPC; the app does not save them to profiles or local storage. Agenda entries and notes remain device-local, with separate storage keys per account; they are not cloud-synced. Pre-existing unauthenticated local data is left intact under its original keys.

## 6. Validate and release

```sh
npm ci
npm test
npm run build
```

Tests include an embedded PostgreSQL instance that executes both migrations and checks row-level security, profile creation, event filtering/ranking, and login throttling. UI tests cover confirmation instructions, onboarding save failures, location denial, and stale search responses. Google consent, email delivery, deployed Edge Functions, and production redirects still require a live check after configuration.

Release builds use Git tags (`v*`). Optional GitHub repository variables `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` override the public project defaults as a pair. Vercel should use `npm run build` and output directory `dist`.
