import type { AxiosInstance } from 'axios';

const slugCache = new Map<string, string>();

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
        console.log('🔎 /objects/{logical} probe', {
          logical,
          ok: true,
          ...obj,
          rawResponse: data,
        });
      }
      return slug;
    } else {
      console.log('🔎 probe EMPTY', {
        logical,
        statusLike: data?.status,
        body: data,
      });
    }
  } catch (e) {
    if (process.env.E2E_MODE === 'true') {
      console.log('🔎 /objects/{logical} probe failed', {
        logical,
        error:
          (e as { response?: { data?: unknown }; message?: unknown })?.response
            ?.data || (e as { message?: unknown })?.message,
      });
    }
  }

  // 2) Fall back to list (some tenants)
  try {
    const { data } = await client.get('/objects', { params: { limit: 200 } });
    const list = Array.isArray(data?.data)
      ? data.data
      : Array.isArray(data)
        ? data
        : data?.objects || [];
    for (const pd of list) {
      if (!pd) continue;
      const fields = [pd.api_slug, pd.slug, pd.id].filter(Boolean).map(String);
      if (fields.includes(logical)) {
        const slug = String(pd.api_slug || pd.slug || pd.id);
        slugCache.set(logical, slug);
        return slug;
      }
    }
  } catch {
    // Intentionally empty - fallback behavior handled below
  }

  // 3) Last resort: assume standard slug
  if (process.env.E2E_MODE === 'true') {
    console.log(`⚠️ resolveObjectSlug fallback → ${logical}`);
  }
  slugCache.set(logical, logical);
  return logical;
}
