# Public event homepage

Visitors see upcoming events before signing in. Sign-in opens a dismissible native dialog for account access and saving; closing it preserves the event search. Existing Supabase sessions still open the personal workspace. Authentication callback failures reopen the sign-in dialog instead of disappearing behind the homepage.

Portuguese and English are available in the header, account workspace and preference form. Interface copy, accessible labels, dates and prices follow the selected language. Event titles, descriptions and user-authored notes retain their original content. The browser language and color preference provide initial defaults. The versioned `schedule.presentation.v1` storage key remembers language and the monochrome light/dark theme. DM Sans and DM Serif Display are unchanged.

## Event source and coverage

`GET /api/public-events` reads public structured records from the [official SP Mais Cultura homepage](https://spmaiscultura.prefeitura.sp.gov.br/). It decodes JSON strings without evaluating scripts, validates presentation dates, removes expired sessions and duplicates, and returns up to 60 events. This is an adapter for the site's public page data, not a documented municipal REST API. The source's homepage controls which events are available; the result is not a complete city catalog.

Coverage is currently São Paulo. The source provides venue addresses but does not provide reliable price or venue coordinates in these records. Those fields remain `null`: cards show “Price not listed”, and map links search the address. These events are excluded from strict free/paid and GPS distance filters when the required data is unknown. Links open the official agenda; visitors should check current details there.

Requests have an eight-second timeout and a two-million-character response limit. Successful results use Vercel CDN caching for 30 minutes, with a one-hour stale response window; browsers cache for one minute. An upstream outage or format change returns HTTP 502 with `no-store`, a translated message and a retry action. A genuinely empty agenda returns an empty list. No credentials are needed for this endpoint and no Supabase RLS grants were changed.

## Search and location

- Events load automatically; keyword and category filters update the visible list. Additional price, date and ordering controls start collapsed. Clearing an authenticated catalog filter refreshes that catalog query.
- City suggestions use Open-Meteo / GeoNames after at least two characters and a 350 ms debounce. Keyboard navigation, selection, Escape and manual fallback are supported. Stale requests are aborted. Selecting a city fills its name and shows a city map/weather summary.
- Keyword suggestions include categories and available event titles through a native datalist. The last successfully searched manual city is remembered under `schedule.search-city.v1`. GPS coordinates are never persisted or requested automatically.
- Device GPS and strict radius lookup remain available in the signed-in workspace. Public events without venue coordinates are never presented with invented distances.

## Run, verify and deploy

Use `npm run dev` for the frontend and local API adapter, `npm test` for behavior and regression tests, and `npm run build` for TypeScript and the optimized frontend build. Local API calls require network access to the official source. No additional environment variables or database migrations are required for this release.

The linked Vercel project builds `main` and deploys the `api/` function alongside `dist/`. Publish a version tag to trigger the existing GitHub Release workflow and produce the static build artifact. The Docker/Nginx image and `npm run preview` serve static files only: the public event feed additionally requires `/api/public-events` from Vercel or an equivalent Node service/proxy. The static artifact alone does not include a running API.

Tests cover public discovery without login/GPS, retry, slow initial loading, translated category searches, saving nullable public records, parser failures, empty agendas, city autocomplete, storage failure, persisted appearance and account drafts across language changes. Existing account, SQL/RLS, agenda and note lifecycle suites remain part of verification.
