/**
 * List search operations.
 */
import type { AttioList } from '../../types/attio.js';
import { getLists } from './base.js';

export async function searchLists(
  query: string,
  limit: number = 20,
  offset: number = 0
): Promise<AttioList[]> {
  const allLists = await getLists(undefined, 100);
  const listsArray = Array.isArray(allLists) ? allLists : [];

  const lowerQuery = query.toLowerCase();
  const filtered = listsArray.filter((list) => {
    if (!list || typeof list !== 'object') return false;

    const name = (list.name || '').toLowerCase();
    const description = (list.description || '').toLowerCase();
    return name.includes(lowerQuery) || description.includes(lowerQuery);
  });

  return filtered.slice(offset, offset + limit);
}
