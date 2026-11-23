# ACOREP Platform — Product specification (V1)

Status: draft for review with ACOREP, 22 Nov 2026. Items marked **[To confirm]** are defaults chosen from international practice; ACOREP must validate them.

## 1. Purpose

A standalone national platform, built from scratch, for the **Autorité Congolaise de Réglementation Pharmaceutique** to:

1. register and license every pharmaceutical establishment in the DRC, province by province;
2. control every import of pharmaceutical products by sea and by air, from the declaration to clearance at the point of entry;
3. give leaders a live, map-based view of the national situation.

The platform does not integrate with SEGUCE/ACOREP or `cartographie.acorep.org` in V1 (client decision: build from scratch). Data can be migrated in later if needed.

The interface is in French only.

## 2. Reference standards

| Area | Standard | How it is applied |
| --- | --- | --- |
| Regulatory functions | WHO Global Benchmarking Tool (GBT): "Licensing establishments" (LI), "Market surveillance and control" (MC), "Regulatory inspection" (RI) | The establishment and import workflows follow these functions; every decision is traceable |
| Distribution | WHO Good Storage and Distribution Practices (TRS 1025, Annex 7, 2020) | Shelf-life check on import lines; inspection outcome at the point of entry |
| Products | WHO INN (DCI), WHO ATC classification, WCO Harmonized System (HS, chapter 30), GS1 GTIN | Fields on each product line; formats validated |
| Locations | ISO 3166-2:CD (26 provinces), ISO 3166-1 (countries), IATA airport codes, UN/LOCODE **[To add]**, GS1 GLN (optional) | Provinces keyed by ISO code everywhere; country codes on origin and shipment |
| Transport | UN/CEFACT Recommendation 19 (modes of transport) | `SEA` and `AIR` in V1, extendable to road, rail and inland waterway |
| Money and dates | ISO 4217, ISO 8601 | Currency on each declaration; all dates stored in ISO 8601 UTC |
| Security | OWASP ASVS level 2, NIST SP 800-63B AAL2 | Server-side authorisation on every call, MFA for every user, append-only audit trail |
| Accessibility | WCAG 2.2 AA | Contrast, keyboard use (including the map), screen-reader labels |
| Map data | geoBoundaries gbOpen (© OpenStreetMap contributors, ODbL 1.0) | Province boundaries, credited on the map. See [data-sources.md](data-sources.md) |

## 3. Users and roles

| Role | Who | Scope | Can |
| --- | --- | --- | --- |
| `ADMIN` | ACOREP central administration | National | Everything, including user management **[V1.1]** |
| `IMPORT_OFFICER` | Direction Import & Export | National | Review import declarations: take up, request information, approve, refuse |
| `PROVINCIAL_OFFICER` | Provincial division | One province | Review establishments in their province: approve (issues the licence), suspend, revoke |
| `INSPECTOR` | Inspectors at ports and airports | National | Clear approved imports or record a non-compliance |
| `LEADERSHIP` | Director General, Ministry | National, read-only | Dashboard and registers, without personal contact details |
| `OPERATOR` | An establishment's own user | Own establishment | Register, file and follow their declarations, answer requests for information |

Rules:
- Authorisation is checked by the API on every request (Cognito groups). The interface only hides what a user cannot do.
- A record the user may not see is answered as "not found", never "forbidden" (no information leak).
- Drafts are visible to their author only.

## 4. Establishments (licensing)

Kinds: importer, wholesaler-distributor, local manufacturer, pharmacy (officine), pharmaceutical depot. Importers, wholesalers and manufacturers may file import declarations.

Data: legal and trade name, RCCM, national ID (Id. Nat.), tax number (NIF), optional GS1 GLN, province, city, commune, address, GPS point (WGS 84), responsible pharmacist (name, Order registration number, contacts), establishment contacts, licence (number, issue date, expiry date).

Workflow:

```
DRAFT → SUBMITTED → UNDER_REVIEW → ACTIVE (licence issued)
                         │  ↕
                         │  INFO_REQUESTED (operator resubmits)
                         └→ REJECTED
ACTIVE → SUSPENDED → ACTIVE | REVOKED
ACTIVE → REVOKED | CLOSED
```

- The licence is valid for **5 years [To confirm]**. "Licence expired" is derived from the expiry date when data is read, never stored.
- A comment is mandatory for: information requested, refusal, suspension, revocation.

## 5. Import declarations

An importer declares a consignment **before shipment [To confirm: prior authorisation vs. notification]**.

Data: mode (sea or air), point of entry (consistent with the mode), bill of lading or air waybill number, carrier, shipment country, supplier, expected arrival, currency, destination province (the importer's), and product lines: brand name, INN, dosage form, strength, ATC code (optional), HS code, DRC marketing authorisation (AMM) number, GTIN (optional), manufacturer, country of origin, batch, expiry date, quantity, packaging unit, unit price.

Points of entry in V1: ports of Matadi, Boma and Banana; airports FIH (Kinshasa), FBM (Lubumbashi), GOM (Goma) and FKI (Kisangani). **[To confirm, plus road border posts such as Kasumbalesa for V2]**

Workflow:

```
DRAFT → SUBMITTED → UNDER_REVIEW → APPROVED → CLEARED (mainlevée)
  │         │            │  ↕          └────→ NON_COMPLIANT
  │         │            │  INFO_REQUESTED (importer resubmits)
  │         │            └→ REJECTED
  └─────────┴→ CANCELLED (by the importer, before review)
```

Checks:
- A product may not expire before the expected arrival (blocking).
- Remaining shelf life under **12 months [To confirm]** on arrival is flagged to the reviewer (warning, not blocking).
- **[V1.1]** Check AMM numbers against the national register of marketing authorisations.
- Comment mandatory for: information requested, refusal, non-compliance.
- Decisions are refused if the record changed since the user opened it (`changed`), to prevent conflicting decisions.

## 6. National dashboard

For staff (not operators), over the last 12 months:
- Indicators: active establishments, active pharmacies, declarations awaiting a decision, imported value (USD equivalent), non-compliances, expired licences.
- Map of the 26 provinces, shaded by the chosen indicator (active pharmacies, active establishments, authorised imports, imported value), with provincial capitals and points of entry. Quantile classes, so Kinshasa does not wash out the other provinces. You can use it with the keyboard and a screen reader.
- Province panel: establishments by kind, files under review, expired licences, imports by mode, value; links to the filtered registers.
- Declarations by status and by mode.

**[To confirm with leadership]**: other indicators (e.g. pharmacies per 100,000 inhabitants, which needs population data; product shortages; top products imported).

## 7. Audit and data protection

- Every status change records who, when, from which status, to which, and the comment. Events are appended and never edited or deleted.
- Personal data (pharmacist and contact phone numbers and e-mails) is hidden from read-only leadership.
- **[To confirm]** Retention periods and the applicable DRC data-protection framework.

## 8. Architecture

Same stack as the Pic'KG project (see CLAUDE.md): React SPA on S3 + CloudFront, API Gateway HTTP API + Lambda (Node 22), DynamoDB, Cognito with mandatory TOTP MFA.

**[To confirm]** AWS region (default proposal: `af-south-1`, Cape Town, for latency and keeping data on the continent), domain (e.g. `plateforme.acorep.gouv.cd`), and AWS account ownership (ACOREP's account recommended).

## 9. Roadmap

1. **Done (demo on mock data):** domain model and rules, national dashboard and map, establishment and declaration registers, review workflows with audit trail, role-based access, demo sign-in.
2. Forms: establishment self-registration (pharmacies on phones), import declaration form with product lines, resubmission after a request for information.
3. Documents: uploads (invoices, certificates of analysis, BL/LTA, licences) to S3, virus scan.
4. Backend: CDK stack, API Lambda using the shared rules, Cognito (e-mail, password, TOTP), staging deployment.
5. Notifications by e-mail (and SMS **[To confirm]**) on each decision.
6. Exports (CSV, PDF of the licence and import authorisation with QR code for verification), user administration.
7. V2: road and river points of entry, AMM register, fees and online payment **[To confirm]**, public pharmacy finder.
