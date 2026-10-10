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

/**
 * Structured selection guidance published by the capability manifest.
 *
 * `formatToolDescription` owns the sentence shape of a tool description, and
 * `formatCapabilityGuidance` renders the same fields for a manifest entry, so
 * one authored statement serves both surfaces instead of drifting apart.
 */
export interface CapabilityGuidance {
  /** What the tool does, stated as the capability the caller can rely on. */
  capability: string;
  /** What the tool does not do, phrased as the things it must never do. */
  boundaries: string;
  /** Limits, required inputs, and caps that constrain the operation. */
  constraints?: string;
  /** What to do when the operation fails or returns an ambiguous result. */
  recovery?: string;
  /** Other tools in the current catalog that serve the same need. */
  alternatives?: readonly string[];
}

/** Render guidance with the repository's canonical description shape. */
export function formatCapabilityGuidance(guidance: CapabilityGuidance): string {
  return formatToolDescription({
    capability: guidance.capability,
    boundaries: guidance.boundaries,
    constraints: guidance.constraints,
    recoveryHint: guidance.recovery,
  });
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
