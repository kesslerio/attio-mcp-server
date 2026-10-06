/**
 * Write deletion / protection lists to /tmp/ files for user review during dry runs.
 */
import fs from 'fs';
import path from 'path';
import { AttioRecord } from '../core/types.js';

/**
 * Persist one record list to /tmp as sorted, human-readable lines.
 *
 * @param describe renders one record as a single line (caller knows the shape)
 */
export function writeDeletionListToTmp(
  resourceType: string,
  records: AttioRecord[],
  isProtected = false,
  describe: (record: AttioRecord) => string = (r) =>
    String(r.id?.record_id ?? r.id ?? 'Unknown')
): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const suffix = isProtected ? 'protected' : 'to-delete';
  const filename = `${resourceType}-${suffix}-${timestamp}.txt`;
  const filepath = path.join('/tmp', filename);

  const lines = records.map(describe).sort();
  fs.writeFileSync(filepath, lines.join('\n') + '\n');
  return filepath;
}
