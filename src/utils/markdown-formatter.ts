/**
 * Markdown to Plain Text Formatter for Attio Notes
 *
 * Converts markdown content to well-formatted plain text that displays
 * nicely in Attio's note interface, which doesn't support rich text.
 */

export interface MarkdownFormatterOptions {
  /** Character to use for bullet points (default: '•') */
  bulletChar?: string;
  /** Maximum line length before wrapping (default: 80) */
  maxLineLength?: number;
  /** Whether to preserve original spacing (default: false) */
  preserveSpacing?: boolean;
  /** Custom section separators */
  sectionSeparators?: {
    h1?: string;
    h2?: string;
    h3?: string;
  };
}

const DEFAULT_OPTIONS: Required<MarkdownFormatterOptions> = {
  bulletChar: '•',
  maxLineLength: 80,
  preserveSpacing: false,
  sectionSeparators: {
    h1: '=',
    h2: '-',
    h3: '~',
  },
};

/**
 * Converts markdown content to formatted plain text suitable for Attio notes
 *
 * @param markdown - The markdown content to convert
 * @param options - Optional formatting configuration
 * @returns Formatted plain text with proper spacing and structure
 */
export function convertMarkdownToPlainText(
  markdown: string,
  options: MarkdownFormatterOptions = {}
): string {
  if (!markdown || typeof markdown !== 'string') {
    return '';
  }

  const opts = { ...DEFAULT_OPTIONS, ...options };
  let text = markdown;

  // Step 1: Handle headers with proper spacing and separators
  text = text.replace(/^# (.+)$/gm, (match, title) => {
    const separator = opts.sectionSeparators.h1!.repeat(
      Math.min(title.length, 60)
    );
    return `\n\n${separator}\n${title.toUpperCase()}\n${separator}\n`;
  });

  text = text.replace(/^## (.+)$/gm, (match, title) => {
    const separator = opts.sectionSeparators.h2!.repeat(
      Math.min(title.length, 50)
    );
    return `\n\n${title}\n${separator}\n`;
  });

  text = text.replace(/^### (.+)$/gm, (match, title) => {
    return `\n\n${title}:\n`;
  });

  // Step 2: Handle bold text markers - convert to section headers
  text = text.replace(/^\*\*([^*]+)\*\*:?\s*$/gm, '\n\n$1:\n');
  text = text.replace(/\*\*([^*]+)\*\*/g, '$1'); // Remove remaining bold

  // Step 3: Handle bullet points with proper indentation
  text = text.replace(/^- (.+)$/gm, `${opts.bulletChar} $1`);
  text = text.replace(/^\* (.+)$/gm, `${opts.bulletChar} $1`);

  // Step 4: Handle numbered lists
  text = text.replace(/^(\d+)\. (.+)$/gm, '$1. $2');

  // Step 5: Handle code blocks and inline code
  text = text.replace(/```[\s\S]*?```/g, ''); // Remove code blocks
  text = text.replace(/`([^`]+)`/g, '"$1"'); // Convert inline code to quotes

  // Step 6: Handle links - extract URL and show it cleanly
  text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1 ($2)');
  text = text.replace(/https?:\/\/[^\s)]+/g, (url) => {
    // Keep URLs readable but not too long
    return url.length > 60 ? url.substring(0, 57) + '...' : url;
  });

  // Step 7: Clean up excessive whitespace while preserving intentional spacing
  if (!opts.preserveSpacing) {
    // Remove trailing spaces from lines
    text = text.replace(/ +$/gm, '');

    // Normalize multiple blank lines to at most 2
    text = text.replace(/\n{3,}/g, '\n\n');

    // Ensure sections have proper spacing
    text = text.replace(/(\n[A-Z\-=~]{3,}\n)/g, '\n$1');
  }

  // Step 8: Handle special formatting for key-value pairs
  text = text.replace(/^([A-Z][^:\n]+):\s*(.+)$/gm, (match, key, value) => {
    if (value.length > 60) {
      return `${key}:\n  ${value}`;
    }
    return `${key}: ${value}`;
  });

  // Step 9: Final cleanup
  text = text.trim();

  // Ensure the text starts cleanly
  text = text.replace(/^[\n\s]+/, '');

  return text;
}

/**
 * Specialized formatter for business research notes
 * Optimized for the common patterns in business qualification content
 */
export function formatBusinessResearchNote(markdown: string): string {
  return convertMarkdownToPlainText(markdown, {
    bulletChar: '•',
    maxLineLength: 90,
    sectionSeparators: {
      h1: '=',
      h2: '-',
      h3: '',
    },
  });
}

/**
 * Compact formatter for shorter notes
 * Uses minimal spacing for concise presentation
 */
export function formatCompactNote(markdown: string): string {
  let text = convertMarkdownToPlainText(markdown, {
    bulletChar: '→',
    preserveSpacing: true,
  });

  // Further compress spacing for compact format
  text = text.replace(/\n\n+/g, '\n');
  text = text.replace(/^[\n\s]+/, '');

  return text;
}

/**
 * Validates if content appears to be markdown and would benefit from formatting
 */
export function isMarkdownContent(content: string): boolean {
  if (!content || typeof content !== 'string') {
    return false;
  }

  const markdownPatterns = [
    /^#{1,6}\s+.+$/m, // Headers
    /^\*\*[^*]+\*\*$/m, // Bold text on its own line
    /^[-*]\s+.+$/m, // Bullet points
    /^\d+\.\s+.+$/m, // Numbered lists
    /\[.+\]\(.+\)/, // Links
    /```[\s\S]*?```/, // Code blocks
  ];

  return markdownPatterns.some((pattern) => pattern.test(content));
}

/**
 * Auto-detects the best formatting approach based on content
 */
export function autoFormatContent(content: string): string {
  if (!isMarkdownContent(content)) {
    return content;
  }

  // If content is very long, use business research formatting
  if (content.length > 1000) {
    return formatBusinessResearchNote(content);
  }

  // For shorter content, use compact formatting
  if (content.length < 300) {
    return formatCompactNote(content);
  }

  // Default formatting for medium-length content
  return convertMarkdownToPlainText(content);
}
