/**
 * Deal tool configurations and exports
 */
import { notesToolConfigs, notesToolDefinitions } from './notes.js';

// Export deal tool configurations for main index
export const dealToolConfigs = {
  ...notesToolConfigs,
};

// Export deal tool definitions for main index
export const dealToolDefinitions = [...notesToolDefinitions];
