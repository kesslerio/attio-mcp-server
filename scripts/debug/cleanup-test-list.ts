/**
 * Cleanup the dedicated TEST list referenced by TEST_LIST_ID.
 * Usage: ATTIO_API_KEY=... node --import tsx scripts/debug/cleanup-test-list.ts
 */
import { deleteList, getListDetails } from '../../src/objects/lists';

async function main() {
  const apiKey = process.env.ATTIO_API_KEY;
  if (!apiKey) throw new Error('ATTIO_API_KEY not set');
  const listId = process.env.TEST_LIST_ID;
  if (!listId) throw new Error('TEST_LIST_ID not set');

  // Verify list exists before deleting (and log details for safety)
  try {
    const details = await getListDetails(listId);
    const name = (details as any)?.name || 'unknown';
    console.log(`Deleting list: ${listId} (name: ${name})`);
  } catch {
    console.warn(`List ${listId} not found or already deleted.`);
  }

  const ok = await deleteList(listId);
  console.log(ok ? 'Deleted' : 'Delete returned false');
}

main().catch((e) => {
  // Sanitize error to prevent sensitive information exposure
  const sanitizedError =
    e instanceof Error
      ? e.message
      : typeof e === 'object' && e?.response?.status
        ? `HTTP ${e.response.status}: Request failed`
        : 'Unknown error';
  console.error('Cleanup failed:', sanitizedError);
  process.exit(1);
});
