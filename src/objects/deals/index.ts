/**
 * Deal module - Central export point
 * Re-exports all deal-related functionality from modular files
 */

// Note operations
export { getDealNotes, createDealNote } from './notes.js';

// Relationship-based queries
export { searchDealsByCompany } from './relationships.js';
