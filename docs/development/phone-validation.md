# Phone Validation Helpers

Our MCP server uses **`libphonenumber-js`** for all normalization and validation. Issue #837 introduced structured helpers that replace ad-hoc parsing.

## Canonical API

```typescript
import {
  isPossiblePhoneNumber,
  isValidPhoneNumber,
  validatePhoneNumber,
  PhoneValidationError,
  PhoneValidationResult,
} from '@/services/normalizers/PhoneNormalizer.js';
```

- `validatePhoneNumber(value, country?)` returns `{ valid, possible, e164?, national?, error? }`.
- `isValidPhoneNumber` and `isPossiblePhoneNumber` are thin wrappers around the library with our default country fallback (`DEFAULT_PHONE_COUNTRY`, default `US`).
- `toE164` remains backward compatible and now routes through the shared helpers.

## Error Model

`validatePhoneNumber` surfaces a `PhoneValidationError` when input fails validation. The `.code` field maps to:

| Code                   | Description                                   |
| ---------------------- | --------------------------------------------- |
| `INVALID_TYPE`         | Input was not a string                        |
| `INVALID_FORMAT`       | Formatting error after metadata checks        |
| `INVALID_COUNTRY_CODE` | Country/region not recognised                 |
| `TOO_SHORT`            | Number shorter than the numbering plan allows |
| `TOO_LONG`             | Number longer than the numbering plan allows  |
| `NOT_A_NUMBER`         | Input cannot be parsed into a phone number    |

Downstream services should throw or surface the formatted message returned by the error instead of silently passing through invalid data.

## Normalizer Behaviour

`AttributeAwareNormalizer` now collects phone validation errors and raises a `UniversalValidationError` when any phone field fails validation. Callers will receive actionable messages such as:

```
Phone number validation failed: phone_numbers[0]: Phone number is too short to be valid. (received "+1202")
```

This behaviour applies to arrays, scalar fields (e.g. `primary_phone`), and objects with `phone_number`/`original_phone_number` keys.

## Metadata Strategy

- Server/runtime code imports the full `libphonenumber-js` metadata by default.
- CLI processes set `ATTIO_PHONE_METADATA=min` automatically, reducing the shipped bundle to the `min` metadata build (~67 kB).
- You can override via environment variable before module load if a custom build requires a different dataset.

Use `PHONE_METADATA_SOURCE` from `@/utils/validation/phone-validation.js` in diagnostics to confirm which metadata bundle loaded at runtime.

## Testing Guidelines

- Add unit tests with `validatePhoneNumber` for each edge case before updating normalizers.
- Regression coverage lives in `test/unit/normalizers/phone-number-normalization.test.ts` and `test/utils/phone-validation.test.ts`.
- Run `npm run test:offline` after touching phone validation to ensure no degenerate fallbacks.
