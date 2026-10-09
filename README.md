# Schedule

> A clear day is a kind of freedom.

Schedule is a focused web-based workspace for keeping daily commitments and loose thoughts in one calm, central place. The interface is intentionally lightweight: a glanceable timeline for the day, quick completion states, and a notes space for ideas that do not belong on a calendar yet.

## AI-generated product message

Schedule helps you make room for what matters. See the shape of your day, move through commitments without friction, and keep the thoughts worth returning to close at hand. It is a small, thoughtful workspace for turning an overwhelming list into a day you can actually inhabit.

## MVP features

- Public upcoming events before login, sourced from the official SP Mais Cultura agenda in São Paulo
- Portuguese/English interface and persistent monochrome light/dark themes, keeping the existing fonts
- City autocomplete, keyword suggestions and compact filters with manual fallback
- Supabase Google OAuth and username/email + password accounts with email confirmation
- Three preference questions after registration: interests, distance, and event budget
- Nearby upcoming event search with device location or manual city fallback
- Owner-managed Supabase event catalog, ranked by saved preferences
- Strict category, free/paid, date and distance filters; sort by match, date, distance or price
- Saved events per account on this device, with one-click addition to the event's local agenda date
- Highlighted search area with OpenStreetMap links and current Open-Meteo weather
- Public city lookup through Open-Meteo / GeoNames, without API keys
- Editable account preferences, persistent sessions, and sign-out
- Persistent workspace navigation and a keyboard-accessible profile menu for preferences and sign-out in every view
- Daily agenda stacks for morning, afternoon, and evening, with categories, durations, completion states, and progress
- Add commitments directly to the daily agenda
- Browse dates, return to today, and remove agenda commitments
- Device-local time and greeting that update with the configured timezone
- Date strip for moving through the working week
- Search across schedule titles and details
- Quick notes on the daily view
- Editable notes workspace; notes and agenda changes persist locally per account on the device
- Recoverable note deletion with a Trash workspace and restore action
- Responsive interface for mobile and desktop

## Stack

- React + TypeScript
- Vite
- Tailwind CSS v4 via `@tailwindcss/vite`
- Lucide icons
- DM Serif Display and DM Sans
- Vitest
- Vercel frontend hosting and public event API; Docker/Nginx for static frontend hosting

Public event source, coverage, language, appearance and deployment: [public homepage](docs/public-event-homepage.md). Account features, migration status and verification: [post-login workspace](docs/post-login-workspace.md). Account and catalog configuration: [Supabase setup](docs/supabase-setup.md).
