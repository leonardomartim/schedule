# Post-login workspace

Event discovery now supports category, free/paid price, inclusive local calendar dates, radius and keyword filters. Preferences rank recommendations; explicit filters restrict matches. SQL applies these restrictions before selecting at most 100 results. Price sorting uses the catalog's numeric minimum price; use a local search when comparing prices in one currency. Unknown prices remain unknown and sort last.

Saved events store complete event details under account-specific local-storage keys. They can be opened without another catalog request. Past events are hidden from the saved upcoming list. Dates and venue details are snapshots: check the official event link for changes. Distances derived from the user's search location are not persisted; venue distance is recalculated for the currently selected location. Saving does not reserve tickets.

Adding an event creates one agenda commitment on its date and time in the browser's timezone. Duplicate event IDs are prevented. Agenda navigation selects a date, moves five days at a time, or returns to today. New manual commitments belong to the selected day. Existing undated commitments are assigned to the local day on the first load of this version. Removing an agenda item allows adding that event again.

Notes, agenda items and saved events stay on the current browser, separated by account. Malformed records are ignored and failed writes display a session-only warning. There is no cloud synchronization.

## Public APIs

- [Open-Meteo geocoding](https://open-meteo.com/en/docs/geocoding-api): explicit city lookup with up to five choices, based on GeoNames.
- [Open-Meteo weather](https://open-meteo.com/en/docs): current temperature and weather code for the selected search location, with coordinates rounded to two decimal places.
- [Open-Meteo terms](https://open-meteo.com/en/terms): the hosted free endpoints are for non-commercial use. Commercial deployments need an appropriate provider plan and endpoint configuration.
- OpenStreetMap links open the selected search area or event venue. No map tiles are loaded until a user follows a link.

Public requests have an eight-second timeout, support cancellation, and ignore responses for replaced locations. Weather failure never prevents catalog discovery. Device geolocation is requested only by the location button; city search is available after denial. Search coordinates are not persisted. Weather is current weather, rather than a forecast for the event date.

Upcoming events still require verified, published entries in Supabase. No third-party event provider credentials or fabricated catalog entries were introduced.

## Structure and unused-file review

- `App.tsx` now gates authentication and loads the account workspace on demand. Event discovery loads separately, keeping it out of the signed-out startup path.
- `workspace/` separates agenda, notes, navigation and shared presentation. `events/` separates filters, cards, persistence and public API access.
- The old `src/data.ts` demonstration records moved to `tests/fixtures/workspace-seed.ts`; production storage no longer imports them or offers an unused anonymous demo path. Historical anonymous storage keys are untouched.
- Removed the unused `VITE_APP_NAME` and `VITE_DEFAULT_TIMEZONE` example settings, the panel button without an action, and keyboard-shortcut labels without handlers.
- TypeScript now rejects unused local declarations and parameters during builds.
- Retained migrations, authentication modules, Docker/Nginx files, the release workflow and `bin/deploy`: each has a runtime, test, deployment or historical-schema purpose. Generated Vite outputs, TypeScript build metadata and dependencies remain ignored.

## Validation and deployment

Run `npm test` and `npm run build`. Tests exercise the real PostgreSQL migrations through PGlite, public API payload handling, strict filters, account-separated saves, geolocation fallback, stale response protection and the complete event-to-agenda interaction.

In restricted Windows environments where Vitest workers cannot read the default temporary directory, set `TEMP` and `TMP` to an existing writable directory before running the tests. This is an environment workaround, not an application setting.

Apply `202610080001_event_search_filters.sql` before publishing the frontend. It was applied to `schedule_DB` (`opxcfxpdslvexjfzqbjm`) through the authenticated Supabase SQL Editor on 2026-10-09. The live database had no `supabase_migrations.schema_migrations` table before this operation; the SQL Editor does not create CLI migration-history records. Before adopting `supabase db push`, reconcile the existing schema and migration history rather than replaying these migrations.

Live verification runs as `authenticated` and checks the new function signature, original argument compatibility, filters, RLS, execution permissions and both indexes. This release does not configure Google OAuth or populate the live event catalog.
