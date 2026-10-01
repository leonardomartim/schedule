# Schedule

> A clear day is a kind of freedom.

Schedule is a focused web-based workspace for keeping daily commitments and loose thoughts in one calm, central place. The interface is intentionally lightweight: a glanceable timeline for the day, quick completion states, and a notes space for ideas that do not belong on a calendar yet.

## AI-generated product message

Schedule helps you make room for what matters. See the shape of your day, move through commitments without friction, and keep the thoughts worth returning to close at hand. It is a small, thoughtful workspace for turning an overwhelming list into a day you can actually inhabit.

## MVP features

- Supabase Google OAuth and username/email + password accounts with email confirmation
- Three preference questions after registration: interests, distance, and event budget
- Nearby upcoming event search with device location or manual city fallback
- Owner-managed Supabase event catalog, ranked by saved preferences
- Editable account preferences, persistent sessions, and sign-out
- Daily agenda stacks for morning, afternoon, and evening, with categories, durations, completion states, and progress
- Add commitments directly to the daily agenda
- Device-local time and greeting that update with the configured timezone
- Date strip for moving through the working week
- Search across schedule titles and details
- Quick notes on the daily view
- Editable notes workspace; notes and agenda changes persist locally per account on the device
- Recoverable note deletion with a Trash workspace and restore action
- Responsive dark interface with warm orange highlights

## Stack

- React + TypeScript
- Vite
- Tailwind CSS v4 via `@tailwindcss/vite`
- Lucide icons
- DM Serif Display and DM Sans
- Vitest
- Docker and Nginx for deployment

## Local development

```bash
npm install
npm run dev
```

Copy `.env.example` to `.env` when environment overrides are needed. Production output can be checked with:

```bash
npm run test
npm run build
```

Follow [Supabase setup](docs/supabase-setup.md) to apply the migrations, deploy username sign-in, enable Google, and populate the real event catalog. This project's public browser configuration is included, with optional environment overrides. Database schema changes and provider configuration require project-owner access.

## Docker

```bash
docker build --build-arg VITE_SUPABASE_URL=https://opxcfxpdslvexjfzqbjm.supabase.co --build-arg VITE_SUPABASE_PUBLISHABLE_KEY=your-public-key -t schedule .
docker run --rm -p 8080:80 schedule
```

The app is also configured for GitHub Pages-compatible static output and tag-based release builds through GitHub Actions.
