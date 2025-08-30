/**
 * CLI color utilities for consistent console output formatting
 */

// ANSI color codes for console output
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  reset: '\x1b[0m',
  bold: '\x1b[1m',
} as const;

/**
 * Applies ANSI color codes to text for terminal display
 *
 * @param text The text to colorize
 * @param color The color to apply
 * @returns Colored text with reset codes
 *
 * @example
 * ```typescript
 * console.error(colorize('Success!', 'green'));
 * console.error(colorize('Warning', 'yellow'));
 * ```
 */
export function colorize(text: string, color: keyof typeof colors): string {
  return `${colors[color]}${text}${colors.reset}`;
}

/**
 * Available color options for the colorize function
 */
export type ColorName = keyof typeof colors;

/**
 * Raw ANSI color codes (exported for direct use if needed)
 */
export { colors };
