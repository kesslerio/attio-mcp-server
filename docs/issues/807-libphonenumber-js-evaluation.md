# Issue #807 – Phone Library Evaluation

## Executive Summary

- **Recommendation:** Adopt `libphonenumber-js` as the canonical validation and normalization library. It provides production-grade parsing, validation, and formatting while staying compatible with the existing `toE164` workflow and offering options to control bundle size.
- **Impact:** Enables more reliable validation (possible/valid checks, error messaging) and richer formatting without rewriting downstream code. Bundles can stay lean by importing reduced metadata builds or tree-shaking unused helpers.

## Current Implementation Snapshot

- The current `toE164` helper only accepts strings, applies a default country fallback from `process.env.DEFAULT_PHONE_COUNTRY`, and delegates to `parsePhoneNumberFromString` to convert valid inputs to E.164, returning `null` otherwise.【F:src/services/normalizers/PhoneNormalizer.ts†L1-L10】
- `AttributeAwareNormalizer` relies on `toE164` to coerce both single values and arrays into `original_phone_number` E.164 strings, but there is no validation error surface—invalid numbers pass through unchanged.【F:src/services/normalizers/AttributeAwareNormalizer.ts†L1-L47】
- Gaps today: no granular validation messaging (possible vs. valid), no type detection, no metadata-driven formatting, and no utilities for client-side “as you type” experiences.

## Library Overview

- `libphonenumber-js` is a modern rewrite of Google’s libphonenumber with a focus on smaller footprint (~145 kB when bundled with sufficient metadata) and pure JavaScript consumption.【F:node_modules/libphonenumber-js/README.md†L1-L65】
- Provides parsing, validation (`isValidPhoneNumber`, `isPossiblePhoneNumber`, `validatePhoneNumberLength`), formatting, and “as you type” helpers out of the box.【F:node_modules/libphonenumber-js/README.md†L75-L129】
- Metadata packages (`min`, `mobile`, `max`) allow selecting the smallest dataset that covers required use cases, enabling bundle-size tuning per surface (server, CLI, browser).【F:node_modules/libphonenumber-js/README.md†L75-L129】

## API Compatibility

- The existing `toE164` helper already wraps `parsePhoneNumberFromString`, so adopting more of `libphonenumber-js` is a natural extension—no breaking API changes to downstream code expected.【F:src/services/normalizers/PhoneNormalizer.ts†L1-L10】
- Additional helpers (e.g., `isValidPhoneNumber`) can be surfaced alongside `toE164` without changing its return type, letting callers opt in to stricter validation paths.
- The library supports default-country fallbacks, international parsing, and E.164 output, matching current expectations for normalized records.【F:node_modules/libphonenumber-js/README.md†L90-L129】

## Bundle Size Considerations

- NPM publishes an unpacked size of ~9.5 MB for `libphonenumber-js` (source + metadata). Tree-shaken bundles that import only required helpers are far smaller, aligning with the documented ~145 kB figure when using the standard metadata set.【bb3cb6†L1-L3】【F:node_modules/libphonenumber-js/README.md†L38-L65】
- Server-side usage (Node.js) is insensitive to bundle size, but CLI packaging should import specific entry points (e.g., `libphonenumber-js/min`) to avoid shipping unnecessary metadata.
- Front-end consumers (if any) can load the `min` metadata build (~67 kB code + 3 kB gzip) or lazily load country-specific metadata to stay within performance budgets.

## Migration Effort Estimate

| Task                                                                         | Effort                     | Notes                                                                                   |
| ---------------------------------------------------------------------------- | -------------------------- | --------------------------------------------------------------------------------------- |
| Audit current phone utilities (`toE164`, normalizers, validators)            | 0.5d                       | Identify all call sites and desired validation states.                                  |
| Expose validation helpers (e.g., `isValidPhoneNumber`) and structured errors | 0.5d                       | Wrap library responses in domain-specific error messages.                               |
| Implement metadata strategy (min/max split)                                  | 0.5d                       | Configure imports per runtime (server vs. browser/CLI).                                 |
| Regression testing (unit + offline suites)                                   | 0.5d                       | Cover common formats, extensions, and edge cases.                                       |
| Documentation & rollout (changelog, developer guide updates)                 | 0.25d                      | Describe new helpers and usage expectations.                                            |
| **Total**                                                                    | **~2.25 engineering days** | One engineer can complete within a sprint, assuming no unexpected integration blockers. |

## Pros & Cons

**Pros**

- Production-ready validation with country metadata and nuanced length/type checks.【F:node_modules/libphonenumber-js/README.md†L75-L129】
- Consistent formatting to E.164 and national formats, reducing duplicate logic across services.【F:node_modules/libphonenumber-js/README.md†L75-L129】
- “As you type” and parsing-in-text utilities unlock better UX for future surfaces without additional libraries.【F:node_modules/libphonenumber-js/README.md†L75-L129】
- Configurable metadata imports keep bundles manageable while supporting global coverage.【F:node_modules/libphonenumber-js/README.md†L75-L129】

**Cons / Mitigations**

- Full metadata adds weight; mitigate by importing `min` metadata or compiling server-only bundles.【F:node_modules/libphonenumber-js/README.md†L38-L65】
- Library updates may lag new numbering plans; schedule periodic metadata refreshes during dependency maintenance windows.
- License (MIT) requires attribution but aligns with current open-source policy.

## Recommendation & Next Steps

1. Keep `toE164` but augment `PhoneNormalizer` to surface `isValidPhoneNumber` and detailed validation errors for upstream tools.
2. Split imports so Node services use the default metadata while any browser/CLI bundles rely on `libphonenumber-js/min` or country-scoped metadata.
3. Add regression tests covering valid, invalid, and edge-case numbers (extensions, different country codes) to guard the migration.
4. Document the canonical helpers in developer docs and update onboarding materials once shipped.
