export const TOOL_NAME_TEMPLATE = '<resource>.<action>'; // verb-first pattern

export interface ToolDescriptionTemplateOptions {
  capability: string;
  boundaries: string;
  constraints?: string;
  requiresApproval?: boolean;
  recoveryHint?: string;
}

export function formatToolDescription(
  options: ToolDescriptionTemplateOptions
): string {
  const sentences: string[] = [];

  // Primary capability - ensure it ends with a period
  const capability = options.capability.trim();
  sentences.push(capability.endsWith('.') ? capability : `${capability}.`);

  // Safety/boundaries - what it does NOT do
  if (options.boundaries) {
    const boundaries = options.boundaries.trim();
    sentences.push(
      boundaries.startsWith('Never ') || boundaries.startsWith('Does not ')
        ? boundaries.endsWith('.')
          ? boundaries
          : `${boundaries}.`
        : `Never ${boundaries.endsWith('.') ? boundaries : `${boundaries}.`}`
    );
  }

  // Approval flag (if write operation)
  if (options.requiresApproval) {
    sentences.push('May require explicit user approval from the host.');
  }

  // Constraints (limits/requirements)
  if (options.constraints) {
    const constraints = options.constraints.trim();
    sentences.push(constraints.endsWith('.') ? constraints : `${constraints}.`);
  }

  // Recovery hint (fallback action)
  if (options.recoveryHint) {
    const hint = options.recoveryHint.trim();
    sentences.push(hint.endsWith('.') ? hint : `${hint}.`);
  }

  return sentences.join(' ');
}

export interface ErrorTemplateOptions {
  code: number;
  message: string;
  recovery?: string;
  docs?: string;
}

export function buildErrorTemplate(
  options: ErrorTemplateOptions
): Record<string, unknown> {
  return {
    code: options.code,
    message: options.message,
    recovery: options.recovery,
    docs: options.docs,
  };
}
