# soc2 — AICPA SOC 2 Trust Services Criteria

## What This Is
Structured knowledge base for SOC 2 Type I/II Trust Services Criteria. SPA explorer with JSON data layers.

## Architecture
- **SPA**: `index.html` + `app.js` + `style.css` (vanilla JS, no build step)
- **Schema**: GRC Portfolio v2.0 Standardized Schema

## Key Data Files
- `controls/library.json` — 49 controls across 5 TSC categories
- `requirements/by-domain/` — security, availability, processing-integrity, confidentiality, privacy
- `cross-references/nist-mapping.json` — NIST CSF alignment
- `cross-references/iso27001-mapping.json` — ISO 27001 mapping
- `templates/readiness-assessment.json` — SOC 2 readiness template

## Conventions
- Kebab-case slugs for all IDs
- Security category (CC series) is always in scope; others are optional

## Important
- Security is the mandatory base category — all SOC 2 reports include it
- Type I = design; Type II = design + operating effectiveness over a period

## Related Repos
- `iso27001/` — ISO 27001 Annex A mapping
- `nist/` — NIST CSF baseline
