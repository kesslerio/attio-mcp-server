/**
 * Create a dedicated TEST list and update .env TEST_LIST_ID to its api_slug.
 * Requires: ATTIO_API_KEY, WORKSPACE_MEMBER_ID (for access assignment)
 * Optional: PARENT_OBJECT (defaults to 'companies'), WORKSPACE_ACCESS (defaults to 'read-and-write')
 * Usage: ATTIO_API_KEY=... WORKSPACE_MEMBER_ID=... node --import tsx scripts/debug/create-test-list.ts
 */
import axios from 'axios';
import { writeFileSync, readFileSync } from 'fs';

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 60);
}

async function main() {
  const apiKey = process.env.ATTIO_API_KEY;
  if (!apiKey) throw new Error('ATTIO_API_KEY not set');
  const memberId = process.env.WORKSPACE_MEMBER_ID;
  if (!memberId) throw new Error('WORKSPACE_MEMBER_ID not set');
  const parentObject = process.env.PARENT_OBJECT || 'companies';
  const access = process.env.WORKSPACE_ACCESS || 'read-and-write';

  const baseURL = (
    process.env.ATTIO_BASE_URL || 'https://api.attio.com/v2'
  ).replace(/\/+$/, '');
  const client = axios.create({
    baseURL,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    timeout: 30000,
  });

  const name = `TEST_List_Attio_MCP_${Date.now()}`;
  const api_slug = `${slugify(name)}_${Math.random().toString(36).slice(2, 6)}`;

  const payload = {
    data: {
      name,
      api_slug,
      parent_object: parentObject,
      workspace_access: access,
      workspace_member_access: [
        {
          workspace_member_id: memberId,
          level: 'full-access',
        },
      ],
    },
  };

  const resp = await client.post('/lists', payload);
  const list = resp?.data?.data || resp?.data;
  const slug = list?.api_slug || api_slug;
  if (!slug) throw new Error('List creation returned no api_slug');
  // Update .env: set TEST_LIST_ID to slug
  try {
    const envPath = '.env';
    const orig = readFileSync(envPath, 'utf8');
    const line = `TEST_LIST_ID=${slug}`;
    const updated = orig.match(/^TEST_LIST_ID=.*/m)
      ? orig.replace(/^TEST_LIST_ID=.*/m, line)
      : `${orig.trim()}\n${line}\n`;
    writeFileSync(envPath, updated, 'utf8');
    console.log(`Created list ${slug} and updated .env TEST_LIST_ID=${slug}`);
  } catch (e) {
    console.warn(
      'List created but failed to update .env. Please set TEST_LIST_ID manually:',
      slug
    );
  }
}

main().catch((e) => {
  console.error('Create test list failed:', e?.response?.data || e);
  process.exit(1);
});
