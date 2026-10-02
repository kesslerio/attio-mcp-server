/**
 * List search operations.
 */
import type { AttioList } from '@/types/attio.js';
import { getLists } from '@/objects/lists/base.js';

export async function searchLists(
  query: string,
  limit: number = 20,
  offset: number = 0
): Promise<AttioList[]> {
  const allLists = await getLists(undefined, 100);

  const lowerQuery = query.toLowerCase();
  const filtered = allLists.filter((list) => {
    const name = (list.name || '').toLowerCase();
    const description = (list.description || '').toLowerCase();
    return name.includes(lowerQuery) || description.includes(lowerQuery);
  });

  return filtered.slice(offset, offset + limit);
}
