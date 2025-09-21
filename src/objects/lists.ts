/**
 * Compatibility barrel for list operations.
 *
 * Keeps legacy import path `../objects/lists.js` working while the real
 * implementation lives in `./lists/` modules.
 */
export * from './lists/index.js';
