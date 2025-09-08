/**
 * Response formatting utilities for tool execution
 *
 * Provides consistent formatting for success responses and result messages
 */

import { ToolErrorContext } from '../../../types/tool-types.js';

  if (details && Object.keys(details).length > 0) {
      .map(
        ([key, value]) =>
          `${key}: ${typeof value === 'object' ? JSON.stringify(value) : value}`
      )
      .join(', ');

    message += ` (${detailsText})`;
  }

  return message;
}
