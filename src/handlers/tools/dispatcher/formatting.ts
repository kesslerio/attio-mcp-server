/**
 * Response formatting utilities for tool execution
 *
 * Provides consistent formatting for success responses and result messages
 */

import { ToolErrorContext } from '../../../types/tool-types.js';

    message += ` (${detailsText})`;
  }

  return message;
}
