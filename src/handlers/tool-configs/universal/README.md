# Universal Tool Configs – Public vs Internal Exports

## Overview
This directory implements the SRP refactor for universal tools. To keep imports stable, `schemas.ts` now serves as a thin aggregator that re-exports the public API while implementation details live in subfolders.

## Public Entry Points (use these)
- `./index.js` – Top-level exports for universal tool configs and types
- `./schemas.js` – Aggregated public schema/validator exports
  - Errors: `ErrorType`, `HttpStatusCode`, `UniversalValidationError`
  - Types: `SanitizedObject`, `SanitizedValue`
  - Validators: `validateUniversalToolParams`, `CrossResourceValidator`
  - Schemas: CRUD, advanced, validation, notes/utility
- `./shared-handlers.js` – Universal handlers used by tool configs
- `./types.js` – Universal tool and params enums/types

Recommended imports:
```ts
import { validateUniversalToolParams, UniversalValidationError } from './schemas.js';
import { searchRecordsSchema, batchOperationsSchema } from './schemas.js';
import { UniversalResourceType } from './types.js';
```

## Internal Modules (do not import directly)
- `schemas/common/*` – Shared types/properties for schemas
- `schemas/core-schemas.ts` – Core CRUD schemas
- `schemas/advanced-schemas.ts` – Advanced/batch/timeframe/relationship schemas
- `schemas/utility-schemas.ts` – Notes/utility schemas
- `schemas/validation-schemas.ts` – Attribute discovery/get schemas
- `validators/*` – Schema orchestrator and field/cross-resource validators
- `errors/validation-errors.ts` – Error definitions

These are subject to refactor without notice. Always go through `./schemas.js` for stability.

## Patterns
- Strategy Pattern: `validateUniversalToolParams` delegates to per-tool validators.
- Shared Validation: pagination/id checks and resource_type suggestion logic centralized.
- Backward Compatibility: Aggregator preserves previous import paths.

## Testing Tips
- Offline fast path: `npm run test:offline`
- Targeted: `vitest -t validateUniversalToolParams`
- Performance budgets: `npm run perf:budgets`

## Contribution Guidelines
- New schemas → place under appropriate `schemas/*` module and export via the aggregator.
- New validators → add to `validators/schema-validator.ts` registry.
- Keep files <500 lines; favor SRP.
