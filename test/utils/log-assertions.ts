import { expect } from 'vitest';

function collectStringValues(
  value: unknown,
  seen: WeakSet<object> = new WeakSet()
): string[] {
  if (typeof value === 'string') {
    return [value];
  }

  if (value instanceof Error) {
    return [value.name, value.message, value.stack ?? ''];
  }

  if (Array.isArray(value)) {
    return value.flatMap((entry) => collectStringValues(entry, seen));
  }

  if (!value || typeof value !== 'object') {
    return [];
  }

  if (seen.has(value)) {
    return [];
  }
  seen.add(value);

  return Object.values(value).flatMap((entry) =>
    collectStringValues(entry, seen)
  );
}

export function expectLogCallsToExclude(
  calls: unknown[][],
  forbiddenSnippets: string[]
): void {
  const stringValues = collectStringValues(calls);

  for (const forbiddenSnippet of forbiddenSnippets) {
    expect(stringValues.some((value) => value.includes(forbiddenSnippet))).toBe(
      false
    );
  }
}

export function findLogCall(
  calls: unknown[][],
  message: string
): unknown[] | undefined {
  return calls.find(([firstArg]) => firstArg === message);
}
