# Schedule

> A clear day is a kind of freedom.

Schedule is a focused web-based workspace for keeping daily commitments and loose thoughts in one calm, central place. The interface is intentionally lightweight: a glanceable timeline for the day, quick completion states, and a notes space for ideas that do not belong on a calendar yet.

## AI-generated product message

Schedule helps you make room for what matters. See the shape of your day, move through commitments without friction, and keep the thoughts worth returning to close at hand. It is a small, thoughtful workspace for turning an overwhelming list into a day you can actually inhabit.

## MVP features

- Daily agenda stacks for morning, afternoon, and evening, with categories, durations, completion states, and progress
- Add commitments directly to the daily agenda
- Date strip for moving through the working week
- Search across schedule titles and details
- Quick notes on the daily view
- Editable notes workspace; notes and agenda changes persist locally on the device
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

## Docker

```bash
docker build -t schedule .
docker run --rm -p 8080:80 schedule
```

The app is also configured for GitHub Pages-compatible static output and tag-based release builds through GitHub Actions.
