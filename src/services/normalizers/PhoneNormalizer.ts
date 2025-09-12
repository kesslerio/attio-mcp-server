import { parsePhoneNumberFromString, CountryCode } from 'libphonenumber-js';

export function toE164(
  input: unknown,
  defaultCountry = (process.env.DEFAULT_PHONE_COUNTRY || 'US') as CountryCode
): string | null {
  if (typeof input !== 'string') return null;
  const parsed = parsePhoneNumberFromString(input, defaultCountry);
  return parsed && parsed.isValid() ? parsed.number : null; // E.164 like +12135551234
}
