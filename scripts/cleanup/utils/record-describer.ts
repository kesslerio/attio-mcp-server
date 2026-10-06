/**
 * Record display helpers — one describe function per resource type,
 * used for dry-run console previews and /tmp deletion lists (issue #620).
 */
import { AttioRecord } from '../core/types.js';
import { extractRecordId, extractRecordName } from '../core/utils.js';

const workspace = () => process.env.ATTIO_WORKSPACE_SLUG || 'workspace';

export function describeTask(record: AttioRecord): string {
  // Task fields first: extractRecordName's values.name early-return can shadow
  // the task content branches (pre-refactor behavior parity).
  const name =
    record.content_plaintext ||
    record.content ||
    record.title ||
    extractRecordName(record, 'tasks');
  const id = record.id?.task_id || record.id;
  return `${name} (${id})`;
}

export function describeCompany(record: AttioRecord): string {
  const name = extractRecordName(record, 'companies');
  const id = record.id?.record_id || record.id || 'Unknown';
  return `${name} (${id})`;
}

export function describePerson(record: AttioRecord): string {
  const nameObj = record.values?.name?.[0];
  const name =
    nameObj?.full_name ||
    (nameObj?.first_name && nameObj?.last_name
      ? `${nameObj.first_name} ${nameObj.last_name}`
      : nameObj?.first_name || nameObj?.last_name) ||
    'Unknown Name';
  const emailObj = record.values?.email_addresses?.[0];
  const email =
    emailObj?.email_address || emailObj?.original_email_address || 'No Email';
  const recordId = extractRecordId(record, 'people');
  const attioUrl =
    record.web_url ||
    `https://app.attio.com/${workspace()}/person/${recordId}/overview`;
  return `${name} (${email}) - ${attioUrl}`;
}

export function describeDeal(record: AttioRecord): string {
  const name = extractRecordName(record, 'deals');
  const id = record.id?.record_id || record.id || 'Unknown';
  const createdBy =
    record.values?.created_by?.[0]?.referenced_actor_type || 'Unknown Creator';
  const createdById =
    record.values?.created_by?.[0]?.referenced_actor_id?.substring(0, 8) ||
    'Unknown ID';
  return `${name} (${id}) - Created by: ${createdBy} (${createdById}...)`;
}

export function describeList(record: AttioRecord): string {
  const name = extractRecordName(record, 'lists');
  const id = record.id?.list_id || record.id || 'Unknown';
  const parentObject =
    record.parent_object || record.parentObject || 'unknown target';
  return `${name} (${id}) - target object: ${parentObject}`;
}

export function describeNote(record: AttioRecord): string {
  const title = record.title || 'Untitled Note';
  const preview = (record.content_plaintext || record.content || '')
    .toString()
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 60);
  const id = extractRecordId(record, 'notes');
  return `${title}${preview ? ` [${preview}]` : ''} (${id})`;
}
