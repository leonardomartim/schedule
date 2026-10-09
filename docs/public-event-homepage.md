# Public event homepage

Visitors see upcoming events before signing in. Sign-in opens a dismissible native dialog for account access and saving; closing it preserves the event search. Existing Supabase sessions still open the personal workspace. Authentication callback failures reopen the sign-in dialog instead of disappearing behind the homepage.

Portuguese and English are available in the header, account workspace and preference form. Interface copy, accessible labels, dates and prices follow the selected language. Event titles, descriptions and user-authored notes retain their original content. The browser language and color preference provide initial defaults. The versioned `schedule.presentation.v1` storage key remembers language and the monochrome light/dark theme. DM Sans and DM Serif Display are unchanged.

## Event source and coverage

`GET /api/public-events` resolves the requested city or country and queries public listings for that region: [Sympla](https://www.sympla.com.br/eventos) for Brazilian cities and national highlights, [Eventbrite](https://www.eventbrite.com/d/japan/all-events/) for international cities and countries, and [SP Mais Cultura](https://spmaiscultura.prefeitura.sp.gov.br/) as an additional official source when searching São Paulo or Brazil. With no location entered, the homepage offers highlights from Brazil, Japan and London; an explicit location replaces them with a regional search.

These are adapters for structured records embedded in public pages, not documented search API contracts. JSON is decoded without evaluating scripts. Coverage depends on each provider's listings and is not a complete worldwide catalog. Sympla and municipal homepage selections have no invented pagination; Eventbrite exposes up to ten pages. Missing prices, currencies or venue coordinates remain unknown; strict price and GPS filters exclude records without the required data. Cards link to the original source and display venue timezones when available. Date filters use the venue's calendar day; Sympla timezone inference uses the Brazilian state.

Each upstream request has an eight-second timeout and a three-megabyte streamed response limit. Successful non-GPS results use a 30-minute CDN cache and one-minute browser cache. Partial provider failures retain successful results, show an incomplete-results notice and use a shorter cache. All-provider failure returns HTTP 502 with `no-store` and a retry action rather than a misleading empty agenda. GPS requests are always `private, no-store`. Responses include resolved location, source status, page and `hasMore`. No API keys, new environment variables, migrations or Supabase RLS grants are required.

## Search and location

- Events load automatically. Changing region requests fresh listings instead of filtering an initial São Paulo snapshot. Keyword, category, price, date and ordering filters remain available. “Load more events” appends and deduplicates subsequent pages. The authenticated Supabase catalog continues to contribute verified published records.
- City/country search recognizes “Japão” and “Japan” as Japan across its cities. Common Portuguese city aliases are translated for geocoding; a country qualifier or autocomplete selection disambiguates cities. Open-Meteo / GeoNames city suggestions use a 350 ms debounce after two characters; localized ISO country names supply country suggestions. Keyboard navigation, Escape and manual entry are supported. Replaced requests are aborted and stale responses ignored.
- Keyword suggestions include categories and available event titles through a native datalist. The last successful manual location is remembered under `schedule.search-city.v1`. GPS coordinates are never persisted or requested automatically.
- The signed-in location button uses device GPS and [Photon / OpenStreetMap](https://github.com/komoot/photon) reverse geocoding to select regional providers. Only events with known coordinates inside the chosen radius are included. Manual city lookup remains available after GPS denial.

## Run, verify and deploy

Use `npm run dev` for the frontend and local API adapter, `npm test` for behavior and regression tests, and `npm run build` for TypeScript and the optimized frontend build. Local API calls require network access to the public sources. The Supabase client has a separate cacheable build chunk. No additional environment variables or database migrations are required for this release.

The linked Vercel project builds `main` and deploys the `api/` function alongside `dist/`. Publish a version tag to trigger the existing GitHub Release workflow and produce the static build artifact. The Docker/Nginx image and `npm run preview` serve static files only: the public event feed additionally requires `/api/public-events` from Vercel or an equivalent Node service/proxy. The static artifact alone does not include a running API.

Tests cover city/country resolution, provider parsing and failures, pagination, duplicate removal, GPS radius/privacy, venue timezones, source URL validation, replaced searches, translated controls and saved-event persistence. Existing account, SQL/RLS, agenda and note lifecycle suites remain part of verification. Development checks on 2026-10-09 returned 55 Curitiba events, 20 Japan events on the first page and 39 after the second, and 15 London events; inventories change over time.
