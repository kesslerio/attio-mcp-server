// Vitest type augmentation for common test patterns
// Allows using `vi.Mock` as a type alias without importing Mock explicitly.
// This avoids large-scale edits across tests.
declare namespace vi {
  // Re-export Vitest Mock type under vi.Mock for type positions
  type Mock = import('vitest').Mock;
}
