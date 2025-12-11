/**
 * Location normalization utility for Attio API compatibility.
 *
 * Attio requires ALL 10 location fields to be present when writing location
 * attributes, even if some are null. This utility ensures all fields are present
 * and maps common aliases to the correct Attio field names.
 *
 * @see https://docs.attio.com/docs/attribute-types/attribute-types-location
 */

/**
 * Normalizes a location object for Attio API compatibility.
 *
 * Maps common aliases:
 * - street, address → line_1
 * - city → locality
 * - state, province → region
 * - postal_code, zip, zip_code → postcode
 * - country → country_code
 * - lat → latitude
 * - lng, lon → longitude
 *
 * @param loc - The location object to normalize (may have aliases or missing fields)
 * @returns A location object with all 10 required fields present
 */
export function normalizeLocation(
  loc: Record<string, unknown>
): Record<string, unknown> {
  return {
    line_1: loc.line_1 ?? loc.street ?? loc.address ?? null,
    line_2: loc.line_2 ?? null,
    line_3: loc.line_3 ?? null,
    line_4: loc.line_4 ?? null,
    locality: loc.locality ?? loc.city ?? null,
    region: loc.region ?? loc.state ?? loc.province ?? null,
    postcode:
      loc.postcode ?? loc.postal_code ?? loc.zip ?? loc.zip_code ?? null,
    country_code: loc.country_code ?? loc.country ?? null,
    latitude: loc.latitude ?? loc.lat ?? null,
    longitude: loc.longitude ?? loc.lng ?? loc.lon ?? null,
  };
}
