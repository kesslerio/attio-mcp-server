import { toE164 } from './PhoneNormalizer.js';
export async function normalizeValues(
  resourceType: string,
  values: Record<string, unknown>,
  attributes?: string[]
) {
  const out: Record<string, unknown> = { ...values };
  for (const [k, v] of Object.entries(values)) {
    const isPhoney = /phone/.test(k); // fast path if you don't want to fetch schemas
    if (isPhoney) {
      const e164 = toE164(v);
      if (e164) out[k] = e164; // only replace when valid
    }
  }
  return out;
}
