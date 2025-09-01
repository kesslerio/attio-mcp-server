/**
 * List Attio workspace members (email, workspace_member_id, workspace_id)
 * Usage: ATTIO_API_KEY=... node --import tsx scripts/debug/list-workspace-members.ts
 */
import axios from 'axios';

async function main() {
  const apiKey = process.env.ATTIO_API_KEY;
  if (!apiKey) {
    console.error('ATTIO_API_KEY not set');
    process.exit(1);
  }
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
    timeout: 20000,
  });

  const resp = await client.get('/workspace_members', {
    params: { limit: 200 },
  });
  const rows = Array.isArray(resp?.data?.data) ? resp.data.data : [];
  console.log('email_address,workspace_member_id,workspace_id');
  for (const r of rows) {
    const id = r?.id || {};
    const wmid = id.workspace_member_id;
    const wid = id.workspace_id;
    const email = r?.email_address || '';
    console.log(`${email},${wmid},${wid}`);
  }
}

main().catch((e) => {
  console.error(e?.response?.data || e);
  process.exit(1);
});
