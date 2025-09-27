import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

function loadEvent(path) {
  const full = resolve(path);
  const raw = readFileSync(full, 'utf8');
  return JSON.parse(raw);
}

function normalize(str) {
  return (str || '').toString().trim().toLowerCase();
}

function tokenize(body, triggerPhrase) {
  const escaped = triggerPhrase.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&');
  const regex = new RegExp(`${escaped}\\s*:?\\s*([^\n]*)`, 'i');
  const match = (body || '').match(regex);
  if (!match) return [];
  return match[1]
    .trim()
    .split(/\s+/)
    .map((token) => token.toLowerCase())
    .filter(Boolean);
}

function extractCommand(body, triggerPhrase = '@claude') {
  const normalized = normalize(body);
  if (!normalized.includes(triggerPhrase.toLowerCase())) return null;

  const tokens = tokenize(body, triggerPhrase);
  if (!tokens.length)
    return { type: 'generic', detail: { mode: 'review', rerun: false } };

  let mode = null;
  let rerun = false;
  for (const token of tokens) {
    if (!mode && ['ultra', 'review'].includes(token)) {
      mode = token;
    }
    if (
      [
        're-review',
        'rereview',
        'rerun',
        're-run',
        'again',
        'refresh',
        'recheck',
      ].includes(token)
    ) {
      rerun = true;
    }
  }

  const isReviewCommand = mode || rerun || tokens.includes('review');
  if (isReviewCommand) {
    return {
      type: 'review',
      detail: {
        mode: mode === 'ultra' ? 'ultra' : 'review',
        rerun,
      },
    };
  }

  return { type: tokens[0] || 'generic' };
}

function main() {
  const eventPath = process.env.GITHUB_EVENT_PATH;
  if (!eventPath) {
    console.error('GITHUB_EVENT_PATH not set');
    process.exit(1);
  }
  const event = loadEvent(eventPath);
  const trigger = process.env.CLAUDE_TRIGGER_PHRASE || '@claude';

  const body =
    event.comment?.body || event.review?.body || event.issue?.body || '';
  const command = extractCommand(body, trigger);

  if (!command) {
    process.stdout.write(JSON.stringify({ shouldRun: false }));
    return;
  }

  const association =
    event.comment?.author_association ||
    event.review?.author_association ||
    'NONE';
  const allowed = new Set(
    (process.env.CLAUDE_ALLOWED_ASSOCIATIONS || 'OWNER,MEMBER,COLLABORATOR')
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean)
  );
  const allowedUsers = new Set(
    (process.env.CLAUDE_ALLOWED_USERS || '')
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean)
  );
  const actor =
    event.sender?.login ||
    event.comment?.user?.login ||
    event.review?.user?.login ||
    '';

  const isMaintainer = allowed.has(association) || allowedUsers.has(actor);

  const payload = {
    shouldRun: true,
    command,
    isMaintainer,
    actor,
    association,
    issue:
      event.issue?.number || event.pull_request?.number || event.number || null,
    isPR: Boolean(event.issue?.pull_request || event.pull_request),
  };

  process.stdout.write(JSON.stringify(payload));
}

main();
