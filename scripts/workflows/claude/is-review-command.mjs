import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function tokenize(body, trigger) {
  const escaped = trigger.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&');
  const regex = new RegExp(`${escaped}\\s*:?\\s*([^\n]*)`, 'i');
  const match = (body || '').match(regex);
  if (!match) return [];
  return match[1]
    .trim()
    .split(/\s+/)
    .map((token) => token.toLowerCase())
    .filter(Boolean);
}

function main() {
  const eventPath = process.env.GITHUB_EVENT_PATH;
  if (!eventPath) {
    console.error('GITHUB_EVENT_PATH not set');
    process.exit(1);
  }
  const trigger = process.env.CLAUDE_TRIGGER_PHRASE || '@claude';
  const raw = readFileSync(resolve(eventPath), 'utf8');
  const event = JSON.parse(raw);
  const body = (event.comment?.body || event.review?.body || '').toString();
  const normalized = body.toLowerCase();
  if (!normalized.includes(trigger.toLowerCase())) {
    process.stdout.write(JSON.stringify({ isReview: false }));
    return;
  }

  const tokens = tokenize(body, trigger);
  let mode = null;
  let rerun = false;
  for (const token of tokens) {
    if (!mode && ['ultra', 'review'].includes(token)) mode = token;
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
  const isReview =
    Boolean(tokens.length) && (mode || rerun || tokens.includes('review'));
  process.stdout.write(
    JSON.stringify({
      isReview,
      mode: mode === 'ultra' ? 'ultra' : 'review',
      rerun,
    })
  );
}

main();
