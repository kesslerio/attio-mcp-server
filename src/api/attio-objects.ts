import type { AxiosInstance } from 'axios';

type AttioObject = { id: string; slug: string; label: string };
const slugCache = new Map<string, string>();

function normalize(s: string) {
  return String(s ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

const CANDIDATES: Record<'companies' | 'people', string[]> = {
  companies: ['companies', 'company', 'accounts', 'organizations', 'orgs'],
  people: ['people', 'person', 'contacts', 'leads', 'prospects'],
};

export async function resolveObjectSlug(
  client: AxiosInstance,
  logical: 'companies' | 'people'
): Promise<string> {
  if (slugCache.has(logical)) return slugCache.get(logical)!;

  const resp = await client.get('/objects');
  const d = resp?.data;

  // Debug: log the actual response structure
  if (process.env.E2E_MODE === 'true') {
    console.log('🔍 /objects response structure:', {
      hasResp: !!resp,
      status: resp?.status,
      hasData: !!d,
      dataType: typeof d,
      dataKeys: d && typeof d === 'object' ? Object.keys(d) : [],
      firstLevel: d,
      isDataArray: Array.isArray(d?.data),
      isDirectArray: Array.isArray(d),
      isObjectsArray: Array.isArray(d?.objects),
    });
  }

  const items: AttioObject[] = Array.isArray(d?.data)
    ? d.data
    : Array.isArray(d)
      ? (d as any)
      : Array.isArray(d?.objects)
        ? d.objects
        : [];

  // If we can't get objects list, fall back to standard slugs
  if (!Array.isArray(items) || !items.length) {
    if (process.env.E2E_MODE === 'true') {
      console.log(
        `⚠️ /objects returned empty/invalid list, falling back to standard slug: ${logical}`
      );
    }
    // Return standard slug as fallback
    const fallbackSlug = logical;
    slugCache.set(logical, fallbackSlug);
    return fallbackSlug;
  }

  const wanted = new Set(CANDIDATES[logical].map(normalize));

  // 1) exact slug
  for (const o of items) {
    if (wanted.has(normalize(o.slug))) {
      slugCache.set(logical, o.slug);
      return o.slug;
    }
  }
  // 2) label fallback
  for (const o of items) {
    if (wanted.has(normalize(o.label))) {
      slugCache.set(logical, o.slug);
      return o.slug;
    }
  }
  // 3) contains fallback
  for (const o of items) {
    const nslug = normalize(o.slug);
    const nlabel = normalize(o.label);
    for (const c of wanted) {
      if (nslug.includes(c) || nlabel.includes(c)) {
        slugCache.set(logical, o.slug);
        return o.slug;
      }
    }
  }
  throw new Error(`Unable to resolve Attio object slug for '${logical}'`);
}
