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
  const parts: string[] = [];

  // Primary capability (<20 words target)
  parts.push(options.capability.trim());

  // Approval flag (if write operation)
  if (options.requiresApproval) {
    parts.push('WRITE: requires approval');
  }

  // Boundaries (what it does NOT do)
  if (options.boundaries) {
    parts.push(`Does not: ${options.boundaries.trim()}`);
  }

  // Constraints (limits/requirements)
  if (options.constraints) {
    parts.push(options.constraints.trim());
  }

  // Recovery hint (fallback action)
  if (options.recoveryHint) {
    parts.push(`If errors occur: ${options.recoveryHint.trim()}`);
  }

  return parts.join(' | ');
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
