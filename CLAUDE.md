# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**ACOREP Platform** is a web platform for the **Autorité Congolaise de Réglementation Pharmaceutique** (ACOREP, https://acorep.gouv.cd/), the DRC's pharmaceutical regulator under the Ministry of Public Health. It has three pillars:

1. **Importers and import declarations.** Actors that import pharmaceutical products into the DRC are registered, and every import must be declared, by sea (maritime shipment) or by air (air cargo).
2. **Pharmacy registry.** All local vendors (officines / pharmacy shops) are registered across the country, organised by province (26 provinces).
3. **National reporting.** Leaders get a clear view of the national situation, centred on a map of the DRC by province: imports, registered actors and pharmacies, and alerts.

**The UI is in French only.** Code, identifiers, comments, commits and docs are in English.

Context from the ACOREP website (Nov 2026):
- ACOREP was created by Décret n° 20/002 (5 March 2020) from the merger of the DPM and the LNCQ. Its Direction Import & Export authorises and controls imports of medicines, active ingredients, cosmetics, medical devices, vaccines, etc.
- Import authorisations are currently processed through an external system, **SEGUCE/ACOREP**, and a mapping of establishments exists (`cartographie.acorep.org`). **Client decision: this platform is built from scratch to international standards, with no integration with those systems in V1.**
- Provincial divisions exist (Kinshasa, Haut-Katanga, Kongo-Central, …).

The product spec is [docs/SPEC.md](docs/SPEC.md), including the table of international standards each feature follows (WHO GBT, INN/ATC, HS, GS1, ISO 3166-2:CD, UN/CEFACT, OWASP ASVS, NIST 800-63B, WCAG 2.2 AA). Read it before building any feature. Items marked **[To confirm]** there are defaults awaiting ACOREP's validation. Map data source and licence: [docs/data-sources.md](docs/data-sources.md).

## Current state

Runnable against mock data (`pnpm dev`, sign in at `/connexion` with a demo profile). No backend, `services/` or `infra/` yet.

- **`packages/shared`** (domain, used by the mock and later the Lambda):
  - `geo.ts`: the 26 provinces (ISO 3166-2:CD code, French name, capital with coordinates), transport modes, points of entry.
  - `roles.ts`: roles, `Session`, `canSeeProvince`.
  - `audit.ts`: `StatusEvent`, `Transitions`, `allowedNext` / `canMove`, `needsComment`, `WorkflowError`, `MoveRequest`.
  - `establishment.ts`: types, `ESTABLISHMENT_TRANSITIONS`, `effectiveEstablishmentStatus` (EXPIRED derived from the licence date), `establishmentActor`, `canSeeEstablishment`, `establishmentView` (strips contacts for leadership), `establishmentInputSchema`.
  - `declaration.ts`: types, `DECLARATION_TRANSITIONS`, `declarationActor`, `canSeeDeclaration` (drafts private), `shortShelfLife`, `declarationInputSchema` (entry point must match mode; no product expiring before arrival).
  - `workflow.ts`: `moveEstablishment` / `moveDeclaration`: the one place a status changes. They check visibility (`not_found`), stale status (`changed`), permission (`forbidden`) and the mandatory comment (`comment_required`), append the audit event, and apply side effects (licence issued on approval, `submittedAt`, `decidedAt`).
  - `stats.ts`: `nationalStats()` for the dashboard (counts and totals only).
- **Web app** (`apps/web`), routes in French:
  - `/connexion`: demo profile picker (`features/auth/session.ts` `DEMO_PROFILES`). `?next=` only accepts same-site paths.
  - `/`: national dashboard (`features/dashboard/`) with the province map (`features/map/DrcMap.tsx`, quantile classes, keyboard and screen-reader labels, capitals and points of entry), province panel and breakdowns. Operators are redirected to `/declarations`.
  - `/declarations`, `/declarations/:id`: list (filters in the URL: `province`, `status`, `mode`, `q`) and detail (shipment, product lines with shelf-life warnings, actions, history).
  - `/etablissements` (staff only), `/etablissements/:id`: register (filters `province`, `kind`, `status`, `q`) and detail (identity, licence, location, pharmacist, the importer's declarations, actions, history).
  - `components/workflow.tsx`: `StatusActions` (options from `allowedNext`; confirmation with comment, required by `needsComment`) and `History`. Detail pages give `StatusActions` `key={status}` so it resets after a decision.
- Demo data: `services/mock/seed.ts`, deterministic, with dates relative to now: ~460 establishments weighted by province and 90 declarations. Changed records are stored in localStorage `acorep.mock.v1` (clear it to reset). Demo session in `acorep.session.v1`. The seed test checks every seeded record against the shared input schemas.
- E2E (`apps/web/e2e/`): review with mandatory comment, importer isolation, provincial scoping (phone); map → province → filtered register, leadership without contacts (desktop). `signInAs(page, /role label/)` in `helpers.ts`.

Next (SPEC §9): establishment registration and declaration forms, document uploads, then the backend.

## Stack (same as the Pic'KG project)

The architecture and conventions follow `/Users/adistar/Documents/Claude/Projects/pickg-new/` (Pic'KG). When in doubt about a pattern (data service, mock, shared schemas, i18n dictionaries, CDK layout, CI), look at how Pic'KG does it and do the same.

- pnpm workspaces monorepo (`pnpm@10.20.0`), TypeScript everywhere (`tsconfig.base.json`: strict, `noUncheckedIndexedAccess`).
- Frontend `apps/web` (`@acorep/web`): Vite + React 18 SPA, React Router 6, TanStack Query 5, Tailwind CSS 4 (configured with `@theme` in `index.css`, no `tailwind.config`), Framer Motion 11, Lucide icons, Zod 3. Hosted on S3 + CloudFront.
- Shared domain `packages/shared` (`@acorep/shared`): imported as TypeScript source, no build step.
- Backend `services/api` (`@acorep/api`): API Gateway HTTP API → one API Lambda (Node 22, arm64, esbuild ESM, a `routeKey` → handler map), DynamoDB single table, Cognito.
- Infra `infra/`: AWS CDK 2 in TypeScript, one stack per stage (`-c stage=staging|prod`).
- Tooling: ESLint flat config at the root, Prettier (`singleQuote`, `printWidth: 120`, `trailingComma: all`, Markdown excluded), Vitest for unit tests (`src/**/*.test.*`), Playwright for E2E (`apps/web/e2e/`), GitHub Actions CI on `main` and `develop-v1`.

## Commands

pnpm is not installed globally on this machine and Node 25 has no corepack, so prefix commands with `npx -y pnpm@10.20.0` (or install pnpm).

```sh
pnpm install
pnpm dev               # web app on http://localhost:5173 (mock data)
pnpm build             # tsc + vite build for every package
pnpm typecheck         # tsc --noEmit in every package
pnpm test              # vitest in every package
pnpm lint              # ESLint; 0 errors required
pnpm format            # Prettier write
pnpm e2e               # Playwright against a production build (vite preview)
pnpm run ci            # what CI runs, minus E2E (`pnpm ci` is a pnpm built-in)
cd infra && npx cdk synth                  # no AWS calls
cd infra && npx cdk diff -c stage=staging  # needs AWS credentials; deploy only when the user says so
```

pnpm 10 blocks dependency install scripts; allowed ones go under `onlyBuiltDependencies` in `pnpm-workspace.yaml`.

## Architecture (planned, mirrors Pic'KG)

- **`packages/shared` is the single source of truth for the domain.** Types, Zod schemas, status machines, the province/city catalogue and the DynamoDB key design live there and are used by both the mock and the Lambda (backend parity). Put a rule in `shared` and both sides follow it.
  - Schema issue messages are **error codes**, not text. The web app shows them as `t.<area>.errors[code]`.
  - `keys.ts` documents the single-table key design and access patterns in its header comment. Keep it current.
- **Data access** goes only through the `DataService` interface (`apps/web/src/services/types.ts`). `services/index.ts` returns the mock today; add the `http` service selected by `VITE_DATA_SOURCE` with the backend. Components never call `fetch` or AWS directly. Calls reject with `Error(<api error code>)`; show them with `t.apiErrors[code]`.
- **The mock service** builds seed data with dates relative to now and stores changes in localStorage (`acorep.mock.v1`), so the whole app is demoable without AWS.
- **Auth:** `features/auth/` (`AuthProvider` clears the query cache on sign-in/out, `useSession()` under `RequireAuth`). Demo sign-in today; production is Cognito with e-mail, password and mandatory TOTP MFA (NIST SP 800-63B AAL2). Roles are Cognito groups. The API checks group claims on every request; the UI's view of the role only decides what is shown.
- **The map** is drawn from `features/map/drcShapes.ts`, generated by `scripts/geo2svg.mjs` (see docs/data-sources.md). Never edit it by hand. Keep the OpenStreetMap attribution under the map.
- **Errors** from the API are `{ error: <code> }` with the same codes the web app translates.
- **Runtime config:** one build serves every stage; Cognito IDs reach the browser through `/config.json` written at deploy (as in Pic'KG).
- **Hosting:** CloudFront in front of a private S3 bucket, `/api/*` routed to the HTTP API on the same domain (no CORS), extensionless paths rewritten to `index.html` by a viewer-request function.

### Domain model (implemented in `packages/shared`; details in SPEC.md)

- **Establishment (Établissement pharmaceutique):** a registered actor. Kinds to confirm: importer / wholesaler-distributor (grossiste-répartiteur), local manufacturer, officine (pharmacy shop), dépôt pharmaceutique. Fields: legal name, RCCM, Id. Nat., NIF, ACOREP authorisation number and expiry, responsible pharmacist (name, Ordre des pharmaciens number), province, city/territory, commune, address, GPS point, contacts, status.
- **Import declaration (Déclaration d'importation):** filed by an importer. Mode `SEA` (maritime) or `AIR` (air cargo), point of entry, origin country, supplier/manufacturer, transport document (bill of lading / air waybill), expected arrival, product lines (product, DCI, form, strength, AMM number, quantity, batch, expiry, value), attached documents, status history.
- **Status machines** (`*_TRANSITIONS`, like Pic'KG's `canTransition`): who may move a record from which status to which. Declarations: `DRAFT → SUBMITTED → UNDER_REVIEW → (INFO_REQUESTED ↔) APPROVED | REJECTED`, then `CLEARED | NON_COMPLIANT` by an inspector. In the UI, show only the moves `allowedNext` returns.
- **Geography:** provinces are always referred to by ISO 3166-2:CD code (`ProvinceCode`), and displayed with `provinceName()`.
- **Roles:** `ADMIN`, `IMPORT_OFFICER`, `PROVINCIAL_OFFICER` (one province), `INSPECTOR`, `LEADERSHIP` (read-only, no contacts), `OPERATOR` (one establishment).

## Rules that apply everywhere

- **French only.** Every user-facing string, including aria-labels, emails and messages, lives in `apps/web/src/i18n/fr.ts` (split into `<area>.fr.ts` files when it grows). Never hard-code French text in components. Label maps use `satisfies Record<Union, string>` so a new status or kind without a label fails `tsc`. Placeholders use `{name}`, filled with `f()`. Format numbers, money, dates and country names with `useI18n()` (`num`, `money`, `date`, `dateTime`, `country`; locale `fr-CD`), never by hand.
- **Rules live in `packages/shared`**, never only in a component: if the UI hides a button, the shared rule must also refuse the action. Schema messages are error codes.
- **Government data is sensitive.** Personal data (pharmacists, contacts) and commercial data (import values, suppliers) are visible only to roles that need them. Provincial agents see only their province, importers only their own establishment. Enforce this in the API, not only in the UI.
- **Every status change goes through `moveEstablishment` / `moveDeclaration`** and is recorded (who, when, from, to, comment). Events are never edited or deleted.
- **Accessibility (WCAG 2.2 AA):** text contrast ≥ 4.5:1 (use the theme tokens in `index.css`), everything reachable by keyboard, icons `aria-hidden` or labelled, live regions for result counts.
- **Illustrations and the map are drawn in code**; never copy artwork from other sites. The logo in `components/Shell.tsx` (`Logo`) and `public/favicon.svg` is a placeholder: replace it only with files ACOREP provides (`docs/brand/`). The palette (navy ink, DRC flag accents) is also a placeholder until their brand guidelines arrive.
- **Demo data is fictional** and the app shows a banner saying so. Never seed real people or businesses.
- **Never hide content behind entrance animations** (render visible by default; animate position/scale, not opacity from 0).
- **Layout:** responsive. Back-office screens (tables, review queues, dashboard) are desktop-first; registration and declaration forms must work well on phones, since many pharmacies will use a phone. Check changes at 390px, about 820px and 1440px.
- **Deploying** to any AWS account happens only when the user says so.

## Open questions

Tracked as **[To confirm]** in [docs/SPEC.md](docs/SPEC.md): prior authorisation vs. notification, points of entry (road borders), licence validity, minimum shelf life, AMM register, AWS region/domain/account, ACOREP branding, leadership indicators, data retention, fees.
