# Zone In

**Zoning rules made simple.** Enter any Chicago address and get a plain-English report on what you can actually build on that lot.

Chicago's zoning ordinance is roughly 1,000 pages of municipal code. Buried inside it are the answers to the only questions a homeowner, small developer, or first-time buyer actually cares about: *How tall can I build? How far back from the sidewalk? How many units fit? Can I add a coach house?* Finding those answers today means knowing your zone class, locating the right section of Title 17, and translating percentages-of-lot-depth into feet.

Zone In collapses that into a single search box. Type an address, get a report.

> **Project origin.** Zone In was built for the **UIC Flashpoint Pitch Hackathon 2025** (November 2025) at the University of Illinois Chicago. The repository was previously named `UIC-Flashpoint-Pitch-Hackathon-2025`; it has been renamed to reflect the product rather than the event. Everything below documents the state of the codebase as it came out of that sprint — including the rough edges, which are listed honestly in [Known Limitations](#known-limitations).

---

## The Problem

Zoning is public information that behaves like private information.

- **The data exists, but not in a usable form** -> The City of Chicago publishes a zoning map and the full ordinance online. Neither tells you what your specific lot can support without significant interpretation.
- **Zone classes are opaque** -> Learning your property is `RS-3` is not an answer. It's a lookup key for a table you now have to go find.
- **Setbacks are formulas, not numbers** -> The code says a rear setback is "50 ft or 28% of lot depth, whichever is less." Nobody wants to do that arithmetic, and getting it wrong is expensive.
- **Professional help is the default path** -> The realistic options today are hiring an architect, a zoning attorney, or an expediter — before you even know whether your idea is feasible.
- **The cost falls hardest on small players** -> A developer with a portfolio has staff for this. A homeowner considering a second-floor addition does not.

## What Zone In Does

Zone In connects the city's own GIS data to a structured knowledge base of the zoning ordinance, then uses an AI model to write the result up in language a non-expert can act on.

- **Address in, report out** -> One input field. No zone class lookup, no parcel ID, no account required to run a report.
- **Resolves zoning from authoritative city data** -> The zone class comes from Chicago's official ArcGIS Zoning MapServer, not a scraped copy or a stale dataset.
- **Computes the numbers, not just the rules** -> Setback percentages, FAR, and maximum buildable area are resolved into actual feet and square feet for the lot in question.
- **Written at a 6th-grade reading level** -> The report prompt explicitly targets plain language and actionable phrasing over code citations.
- **Flags nonconforming lots** -> When a lot is smaller than its district's minimum lot area per unit, the report explains the lot-of-record rule instead of just failing the check.
- **Visual confirmation** -> A Google Maps hybrid/satellite view with a dropped marker, so you can verify the geocoder found the right parcel.
- **Report export** -> Reports render as Markdown in-app, with a PDF download path for sharing with contractors or lenders.

## Example Report

This is the output format the prompt targets, using the reference property baked into the system prompt:

```
Address: 1916 S FAIRFIELD AVE
Zoning District: RS-3 (Residential Single-Unit)
Lot Dimensions (L × W): 125 ft × 25 ft
Lot Area: 3,125 sq ft
Floor Area Ratio (FAR): 0.9 -> max buildable area = 2,812 sq ft
Lot Area per Unit: 2,500 sq ft per dwelling unit
Minimum Lot Area: 2,500 sq ft
Maximum Height: 30 ft (≈ 2.5 stories)
Front Yard Setback: Must match average of neighbors (around 20 ft)
Side Yard Setback: Minimum 2 ft each side, 20% of lot width in total
Back Yard Setback: 28% of lot depth (~35 ft in this case)

Summary:
This property is located in the RS-3 district, intended mainly for detached
homes. On this lot, you may build up to about 30 feet in height (roughly two
to three stories), with a total indoor area of around 2,800 square feet...
```

A sample generated PDF ships in the repo at [`public/property_report_1916SFairfieldAve.pdf`](public/property_report_1916SFairfieldAve.pdf).

## How It Works

The pipeline that turns a street address into a zoning report has five stages. Stages 1–3 are deterministic GIS work; stages 4–5 are where the ordinance gets translated into English.

### 1. Geocode the address

`geocodeAddress()` in [`src/lib/chicagoApi.ts`](src/lib/chicagoApi.ts) queries the **Chicago Address Locator** (`Chicago_Addresses/GeocodeServer/findAddressCandidates`) with the raw address string. The city's locator returns up to 10 candidates, each with an ArcGIS match score. Candidates are ranked by that score and the highest is taken.

Using the city's own geocoder rather than a general-purpose one matters here — it is authoritative for Chicago address points and returns city-specific attributes alongside the coordinates.

### 2. Reproject to the city's coordinate system

The geocoder returns WGS84 (`EPSG:4326`) longitude/latitude. Chicago's zoning MapServer does not accept that. It expects **`EPSG:3435` — NAD83 / Illinois East (ftUS)**, a state plane projection measured in US survey feet.

`projectTo3435()` uses `proj4` to convert between them:

```
+proj=tmerc +lat_0=36.6666666666667 +lon_0=-88.3333333333333
+k=0.999975 +x_0=300000 +y_0=0 +datum=NAD83 +units=us-ft +no_defs
```

This step is the reason a naive lat/lon query against the zoning server returns nothing.

### 3. Identify the zoning polygon at that point

`identifyAtPoint()` calls the **Zoning MapServer** `/identify` endpoint with the projected point, a 2-unit tolerance, and a 500 ft bounding extent constructed around the coordinate. The query targets **layer 15**, the zoning district layer.

`extractZoneClass()` then pulls the `ZONE_CLASS` attribute off the layer-15 hit — the string that drives everything downstream (`RS-3`, `B1-2`, `DX-7`, and so on).

### 4. Look up the district in the zoning knowledge base

[`src/app/models/domain/zoning.ts`](src/app/models/domain/zoning.ts) is a hand-built structured encoding of Chicago's zoning ordinance — **67 zone classes across 9 district groups**. Each zone carries seven parameters:

| Field | Meaning |
| --- | --- |
| `floor_area_ratio` | FAR multiplier — total buildable floor area as a multiple of lot area |
| `lot_area_per_unit` | Square feet of land required per dwelling unit |
| `min_lot_area` | Smallest legally conforming lot in the district |
| `maximum_height` | Height cap, typically in feet, often with use-based exceptions |
| `front_yard_setback` | Distance from the front property line, usually a formula |
| `side_yard_setback` | Combined and per-side minimums, usually a percentage of lot width |
| `back_yard_setback` | Rear setback, usually a percentage of lot depth with a hard cap |

These are stored as the ordinance's own prose ("50 ft or 28% of lot depth, whichever is less") rather than as bare numbers, which is what lets the model resolve them against a specific lot while preserving the conditional logic.

### 5. Generate the report

[`src/app/prompt.ts`](src/app/prompt.ts) assembles a system prompt that casts the model as an "Architect Agent," embeds the **entire** zoning knowledge base as JSON, and specifies:

- the exact field order the report must follow
- setback arithmetic rules for resolving percentages against the lot
- imperial units only, with height expressed in both feet and approximate stories
- the nonconforming lot-of-record disclosure, triggered when lot area falls below the district's lot area per unit
- a 6th-grade reading level target

The route at [`src/app/api/zoning/route.ts`](src/app/api/zoning/route.ts) prepends `Address:` and `Zone Class:` to that prompt and posts it to the OpenAI Chat Completions API. The Markdown response is rendered directly in the results view.

### Request flow, end to end

```
User enters address
      │
      ▼
AddressInput.tsx ──────────► page.tsx  (state: "input" -> "loading")
                                  │
                                  ▼
                          useOpenAI().sendPrompt(address)
                                  │
                                  ▼  POST /api/zoning
                       ┌──────────────────────────┐
                       │  src/app/api/zoning      │
                       │                          │
                       │  getZoningByAddress()    │
                       │    ├─ geocodeAddress()   │──► Chicago GeocodeServer
                       │    ├─ projectTo3435()    │    (proj4, local)
                       │    ├─ identifyAtPoint()  │──► Chicago Zoning MapServer
                       │    └─ extractZoneClass() │    (layer 15)
                       │              │           │
                       │              ▼           │
                       │  DEFAULT_PROMPT +        │
                       │  chicagoZoningData JSON  │──► OpenAI Chat Completions
                       └──────────────────────────┘
                                  │
                                  ▼
                   page.tsx (state: "results") ──► ResultsSection.tsx
                                                     ├─ Markdown report
                                                     ├─ Google Maps view
                                                     └─ PDF download
```

## Chicago Zoning Districts Covered

The knowledge base encodes every district group in Title 17:

| Group | Subdistricts | Zones | What it covers |
| --- | --- | --- | --- |
| **Residential** | RS, RT, RM | 11 | Detached single-family, two-flats and townhouses, multi-unit |
| **Business** | B1, B2, B3 | 15 | Neighborhood shopping, neighborhood mixed-use, community shopping |
| **Commercial** | C1, C2, C3 | 13 | Neighborhood commercial, motor vehicle-related, commercial/manufacturing employment |
| **Downtown** | DC, DR, DS, DX | 13 | Downtown core, residential, service, and mixed-use |
| **Manufacturing** | M1, M2, M3 | 9 | Limited manufacturing/business park, light industry, heavy industry |
| **Planned Manufacturing** | PMD | 1 | Protected industrial corridors |
| **Planned Development** | PD | 1 | Large negotiated developments — campuses, towers |
| **Transportation** | T | 1 | Rail lines, bus ways, bike trails |
| **Parks and Open Space** | POS-1, POS-2, POS-3 | 3 | Regional, community, and neighborhood parks |

PD and PMD districts are intentionally open-ended in the data — their parameters are negotiated per project or inherited from the pre-existing zoning, and the knowledge base records that fact rather than inventing numbers.

## Tech Stack

| Layer | Technology |
| --- | --- |
| Framework | [Next.js 14](https://nextjs.org/) (App Router, React 18) |
| Language | TypeScript (strict) |
| Authentication | [Clerk](https://clerk.com/) (`@clerk/nextjs`, middleware-protected routes) |
| Database | [Supabase](https://supabase.com/) PostgreSQL via [Drizzle ORM](https://orm.drizzle.team/) |
| Payments | [Stripe](https://stripe.com/) (checkout links + webhook handler) |
| AI | OpenAI Chat Completions API (`gpt-4o` by default) |
| Geospatial | [proj4](http://proj4js.org/) for WGS84 -> EPSG:3435 reprojection |
| UI Components | [shadcn/ui](https://ui.shadcn.com/) on Radix UI |
| Styling | Tailwind CSS 3.4 + `tailwindcss-animate` + typography plugin |
| Animation | Framer Motion |
| Notifications | Sonner + shadcn Toaster |
| Markdown | `react-markdown` + `remark-gfm` |
| PDF | `jspdf` + `html2canvas` |
| Testing | Vitest + Testing Library (configured; see Known Limitations) |
| Tooling | ESLint, Prettier (with Tailwind class sorting) |

### APIs and External Services

| Service | Purpose | Auth |
| --- | --- | --- |
| Chicago Address Locator (ArcGIS) | Geocodes street addresses to coordinates | None |
| Chicago Zoning MapServer (ArcGIS) | Returns `ZONE_CLASS` for a projected point (layer 15) | None |
| OpenAI Chat Completions | Generates the plain-language zoning report | API key |
| Google Maps JavaScript API | Hybrid/satellite property view with marker | API key |
| Clerk | Authentication and user management | API keys |
| Stripe | Subscription billing and webhooks | API keys |
| Supabase | Hosted PostgreSQL for customer records | Connection string |

The two Chicago GIS endpoints are **public and unauthenticated** — the core zoning lookup works without any city API key.

## Prerequisites

- **Node.js** 18.17+ (required by Next.js 14)
- **npm**
- An **OpenAI API key** — required for report generation
- A **Google Maps API key** — required for the map views
- Accounts for **Clerk**, **Supabase**, and **Stripe** — required for auth, database, and billing. All three have free tiers.

> The zoning lookup itself (`getZoningByAddress`) depends only on the public Chicago GIS endpoints, so that path can be exercised without any third-party keys.

## Getting Started

```bash
# 1. Clone the repository
git clone https://github.com/NicolasChua/ZoneIn.git
cd ZoneIn

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp config/env/.env.example config/env/.env.local
# then fill in the values — see the table below

# 4. Start the local Supabase instance (optional, for local DB work)
npx supabase start

# 5. Push the Drizzle schema to your database
npm run db:push

# 6. Start the dev server
npm run dev
```

The app runs at **http://localhost:8080** — not 3000. The port is set explicitly in the `start:dev` script. If you started Supabase locally, its Studio is at **http://127.0.0.1:54323**.

### Environment Variables

Environment files live under `config/env/`, and the npm scripts load them explicitly through `dotenv-cli` — `.env.local` for development, `.env.test` for the test suite.

| Variable | Required for | Notes |
| --- | --- | --- |
| `OPENAI_API_KEY` | Report generation | Server-side only |
| `OPENAI_MODEL` | Report generation | Defaults to `gpt-4o` if unset |
| `OPENAI_API_BASE` | Report generation | Optional; for proxies or Azure |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Map views | **Must** carry the `NEXT_PUBLIC_` prefix — it is read in the browser |
| `DATABASE_URL` | Database | Supabase PostgreSQL connection string |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Auth | Clerk public key |
| `CLERK_SECRET_KEY` | Auth | Clerk secret key |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | Auth | Must remain `/login` |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | Auth | Must remain `/signup` |
| `STRIPE_SECRET_KEY` | Billing | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | Billing | Verifies webhook signatures |
| `NEXT_PUBLIC_STRIPE_PAYMENT_LINK_MONTHLY` | Billing | Stripe payment link |
| `NEXT_PUBLIC_STRIPE_PAYMENT_LINK_YEARLY` | Billing | Stripe payment link |

`config/env/.env.example` also lists optional keys for DeepSeek, Anthropic, Gemini, and Grok. None are wired into the zoning route — it calls OpenAI directly.

## Project Structure

```
├── config/env/
│   ├── .env.example                     # Template for all environment variables
│   └── .env.test                        # Loaded by the Vitest scripts
├── public/
│   └── property_report_*.pdf            # Sample generated zoning report
├── src/
│   ├── app/
│   │   ├── (unauthenticated)/
│   │   │   ├── (marketing)/             # Landing page, pricing, features, about, contact
│   │   │   │   ├── (auth)/              # Clerk login + signup routes
│   │   │   │   └── _components/         # Header, footer, hero, FAQ, CTA sections
│   │   │   └── confirmation/            # Post-checkout confirmation
│   │   ├── (authenticated)/
│   │   │   └── dashboard/               # Account, billing, support (Clerk-protected)
│   │   ├── api/
│   │   │   ├── zoning/route.ts          # * Core endpoint: address -> zone class -> report
│   │   │   └── stripe/webhooks/route.ts # Stripe subscription lifecycle
│   │   ├── models/
│   │   │   ├── domain/zoning.ts         # * Structured Chicago zoning ordinance (67 zones)
│   │   │   └── codec/zoning.ts          # Placeholder for Zod validation schemas
│   │   ├── providers/
│   │   │   ├── ChicagoCityProvider.tsx  # Context wrapping the GIS lookup
│   │   │   └── OpenAIProvider.tsx       # Context wrapping the report request
│   │   ├── prompt.ts                    # * Architect Agent system prompt
│   │   ├── page.tsx                     # * Flow orchestrator: input -> loading -> results
│   │   └── layout.tsx                   # Root layout, all providers
│   ├── features/
│   │   ├── zoningReport/
│   │   │   ├── AddressInput.tsx         # Address entry form + validation
│   │   │   ├── LoadingSection.tsx       # Animated progress steps + map preview
│   │   │   ├── ResultsSection.tsx       # Markdown report, map, PDF download
│   │   │   └── PropertyVisualization.tsx  # Standalone Google Maps property view
│   │   └── billing/
│   │       ├── actions/                 # Server actions for customers + Stripe
│   │       └── components/              # Pricing buttons, checkout redirect
│   ├── lib/
│   │   ├── chicagoApi.ts                # * Geocoding, reprojection, zoning identify
│   │   ├── stripe.ts                    # Stripe client
│   │   └── utils.ts                     # cn() class merging helper
│   ├── components/
│   │   ├── ui/                          # shadcn/ui primitives
│   │   └── utility/                     # Markdown renderer, Tailwind breakpoint indicator
│   ├── db/
│   │   ├── schema/customers.ts          # Drizzle schema: customers + membership enum
│   │   ├── migrations/                  # Generated SQL migrations
│   │   └── seed/                        # Seed data
│   └── hooks/                           # use-toast, use-mobile, use-local-storage
├── supabase/                            # Supabase CLI project config
├── middleware.ts                        # Clerk route protection (/dashboard/*)
└── drizzle.config.ts                    # Drizzle Kit configuration
```

`*` marks the files that make up the Zone In feature itself. Everything else is application scaffolding — auth, billing, marketing pages — carried over from the SaaS template the project started from.

### Path Alias

| Alias | Maps to | Example |
| --- | --- | --- |
| `@/*` | `src/*` | `import { getZoningByAddress } from "@/lib/chicagoApi"` |

## Architecture

The codebase separates the zoning feature into four layers, each with a single job.

### Models (`src/app/models/`)

- **`domain/`** holds the zoning ordinance as structured data. It is the knowledge base, has no dependencies, and is the one file to edit when the ordinance changes.
- **`codec/`** is reserved for Zod schemas validating API inputs and zoning data shapes. It is currently a documented placeholder.

### Library (`src/lib/`)

Pure functions, no React, no framework coupling. `chicagoApi.ts` exports each pipeline stage separately — `geocodeAddress`, `projectTo3435`, `identifyAtPoint`, `extractZoneClass` — plus `getZoningByAddress` as the orchestrating entry point. Each stage is independently callable, which makes the GIS chain testable without standing up the app.

### API Routes (`src/app/api/`)

The zoning route is the only place where the GIS lookup, the prompt, and the OpenAI key meet. Keeping it server-side means the API key never reaches the browser and the full zoning JSON is never shipped to the client. It validates input and returns `400` on a missing address, `404` when no zoning polygon matches, and `500` when the key is unconfigured.

### Providers and Features (`src/app/providers/`, `src/features/`)

React Context providers own request state (`loading`, `error`) and expose a single async function to components. `page.tsx` drives a three-state machine — `"input" -> "loading" -> "results"` — and each state renders one feature component. Components stay presentational; fetching logic lives in the providers.

## Application Flow

| State | Component | What the user sees |
| --- | --- | --- |
| `input` | `AddressInput` | Search field, validation, three feature cards |
| `loading` | `LoadingSection` | Three animated steps — *Locating property -> Fetching city records -> Generating report* — over a live Google Maps view of the address |
| `results` | `ResultsSection` | Rendered Markdown report, property map, PDF download, start over |

Failures at any stage surface as a Sonner toast and return the UI to `input` rather than stranding the user on a spinner.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the dev server on port 8080 |
| `npm run build` | Production build |
| `npm run start` | Start the production server |
| `npm run lint` | Run ESLint |
| `npm run lint:fix` | ESLint with autofix |
| `npm run tsc` / `npm run types` | TypeScript type check, no emit |
| `npm run format:write` | Format with Prettier |
| `npm run format:check` | Check formatting without writing |
| `npm run clean` | `lint:fix` + `format:write` |
| `npm run check` | Full gate: format check, lint, types, tests with coverage |
| `npm run test` | Vitest in watch mode |
| `npm run test:ci` | Vitest once with coverage |
| `npm run db:push` | Push the Drizzle schema to the database |
| `npm run db:migrate` | Run migrations |
| `npm run db:seed` | Seed the database (requires Bun) |
| `npx supabase start` | Start local Supabase |
| `npx shadcn@latest add [name]` | Add a shadcn/ui component |

## Known Limitations

Zone In was built under hackathon time pressure. These are real, verified gaps in the current `main` — documented so whoever picks this up next knows exactly where to start.

**Blocking bugs**

- **API URLs are wrapped in angle brackets.** `src/app/api/zoning/route.ts:64` and `src/lib/chicagoApi.ts:26,30` contain URLs written as `"<https://...>"`, an artifact of pasting from Markdown. These strings are not valid URLs and fail at `fetch` time. Same issue on the SVG namespace at `LoadingSection.tsx:127`.
- **Over-escaped string literals.** The address validator in `AddressInput.tsx` tests `/\\d/` (a literal backslash followed by `d`) instead of `/\d/`, and prompt assembly in `route.ts` uses `\\n` instead of `\n`. Both are double-escape artifacts from the same paste.
- **PDF download 404s.** `ResultsSection.tsx:95` links to `/sample-report.pdf`, but the only file in `public/` is `property_report_1916SFairfieldAve.pdf`. The download is also static — it does not render the generated report. `jspdf` and `html2canvas` are installed but unused.

**Scope constraints**

- **Lot dimensions are hardcoded.** The prompt's final instruction fixes every lot at 125 ft × 25 ft / 3,125 sq ft. That is the standard Chicago residential lot and works for the demo, but every FAR and setback figure in a report is computed against it rather than the property's real dimensions. Wiring in actual parcel geometry from the county assessor or the city's parcel layer is the highest-value next step.
- **Chicago only.** The geocoder, the projection, and the MapServer layer are all Chicago-specific. Another city means a different locator, a different state plane projection, and a re-encoded ordinance.
- **Single zoning layer.** Only layer 15 (zoning districts) is queried. Overlay districts, landmark designations, TOD provisions, and pending zoning changes are not reflected.
- **No result caching.** Every submission re-runs the full geocode -> identify -> LLM chain. The zoning class for an address is stable and highly cacheable.
- **Whole knowledge base per request.** All 67 zone classes are serialized into every prompt. Selecting only the matched district would cut token cost substantially.

**Infrastructure**

- **No tests exist.** Vitest, Testing Library, and Playwright are installed and `npm run test` is wired up, but there is no `vitest.config.ts` and no test files, so `npm run check` will not pass as written. `src/lib/chicagoApi.ts` is pure and is the natural place to start.
- **`NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` is missing from `.env.example`.** The map components read it, but nothing in the template tells you to set it — maps fail silently into a placeholder.
- **Stale scaffolding.** `package.json` still declares `"name": "mckays-app-template"`, the marketing hero still advertises the template, and `license` carries the template author's MIT copyright. The `src/app/scripts/test-zoning.mjs` helper imports from `../api/chicagoCityAPI.js`, a path that no longer exists after the feature-directory reorganization.

**Disclaimer:** Zone In produces informational estimates generated by a language model. It is not legal advice, not a zoning determination, and not a substitute for consulting the Chicago Department of Planning and Development, a licensed architect, or a zoning attorney before making decisions.

## License

MIT — see [`license`](license).

The project was scaffolded from [mckays-app-template](https://github.com/mckaywrigley/mckays-app-template), whose MIT copyright the license file retains.
