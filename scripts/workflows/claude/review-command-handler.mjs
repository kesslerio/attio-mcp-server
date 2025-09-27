import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

function main() {
  const eventPath = process.env.GITHUB_EVENT_PATH;
  if (!eventPath) {
    console.error('GITHUB_EVENT_PATH not set');
    process.exit(1);
  }
  const data = JSON.parse(readFileSync(resolve(eventPath), 'utf8'));
  const trigger = process.env.CLAUDE_TRIGGER_PHRASE || '@claude';
  const body = (data.comment?.body || data.review?.body || '').toString();
  const escaped = trigger.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&');
  const regex = new RegExp(`${escaped}\\s*:?\\s*([^\n]*)`, 'i');
  const match = body.match(regex);
  const tokens = (match?.[1] || '')
    .trim()
    .split(/\s+/)
    .map((token) => token.toLowerCase())
    .filter(Boolean);
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
    )
      rerun = true;
  }
  if (!mode) mode = 'review';
  const payload = {
    issue: data.issue?.number || data.pull_request?.number,
    mode,
    rerun,
  };
  writeFileSync(
    process.argv[2] || './claude-review-command.json',
    JSON.stringify(payload)
  );
}

main();
