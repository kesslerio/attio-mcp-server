/**
 * Field Mapping Helper for Universal Tools - Legacy Compatibility Layer
 *
 * This file has been refactored for Issue #529 using the Strangler Fig pattern.
 * All functionality has been moved to the modular field-mapper/ directory.
 * This file now serves as a compatibility layer that re-exports from the new modules.
 *
 * The new modular architecture provides:
 * - Better maintainability through single responsibility modules
 * - Improved testability with focused unit tests
 * - Enhanced organization with feature-first structure
 *
 * All exports maintain 100% backward compatibility.
 */

// Re-export everything from the new modular field-mapper structure
export * from './field-mapper/index.js';
