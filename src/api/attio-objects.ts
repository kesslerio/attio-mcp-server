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

  // 1) Try direct object endpoint (most reliable)
  try {
    const { data } = await client.get(`/objects/${logical}`);
    const obj = (data && data.data) || data;
    if (obj && (obj.api_slug || obj.slug || obj.id)) {
      const slug = String(obj.api_slug || obj.slug || obj.id);
      slugCache.set(logical, slug);
      if (process.env.E2E_MODE === 'true') {
        console.log('🔎 /objects/{logical} probe', { logical, ok: true, ...obj, rawResponse: data });
      }
      return slug;
    } else {
      console.log('🔎 probe EMPTY', { logical, statusLike: data?.status, body: data });
    }
  } catch (e) {
    if (process.env.E2E_MODE === 'true') {
      console.log('🔎 /objects/{logical} probe failed', { logical, error: (e as any)?.response?.data || (e as any)?.message });
    }
  }

  // 2) Fall back to list (some tenants)
  try {
    const { data } = await client.get('/objects', { params: { limit: 200 } });
    const list = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : data?.objects || [];
    for (const pd of list) {
      if (!pd) continue;
      const fields = [pd.api_slug, pd.slug, pd.id].filter(Boolean).map(String);
      if (fields.includes(logical)) {
        const slug = String(pd.api_slug || pd.slug || pd.id);
        slugCache.set(logical, slug);
        return slug;
      }
    }
  } catch {}

  // 3) Last resort: assume standard slug
  if (process.env.E2E_MODE === 'true') {
    console.log(`⚠️ resolveObjectSlug fallback → ${logical}`);
  }
  slugCache.set(logical, logical);
  return logical;
}
