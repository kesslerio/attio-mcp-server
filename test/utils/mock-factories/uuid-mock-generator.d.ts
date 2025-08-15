/**
 * UUID Mock Generator for Performance Tests
 *
 * Provides deterministic UUID generation for performance testing that maintains
 * consistent benchmark results while satisfying UUID validation requirements.
 *
 * Addresses: Performance test UUID validation failures (PR #483)
 */
/**
 * Deterministic UUID generator for performance testing
 *
 * Creates valid UUIDs with deterministic seeding to ensure consistent
 * performance benchmarks across test runs while satisfying validation.
 */
export declare class UUIDMockGenerator {
  private static seedCounter;
  /**
   * Generate a deterministic UUID v4 for testing
   *
   * Uses a seeded approach to ensure consistent UUIDs for performance
   * benchmarking while maintaining valid UUID format.
   *
   * @param seed - Optional seed for deterministic generation
   * @returns Valid UUID v4 string
   */
  static generateDeterministicUUID(seed?: string): string;
  /**
   * Generate mock company UUID with company prefix
   */
  static generateCompanyUUID(identifier?: string): string;
  /**
   * Generate mock person UUID with person prefix
   */
  static generatePersonUUID(identifier?: string): string;
  /**
   * Generate mock task UUID with task prefix
   */
  static generateTaskUUID(identifier?: string): string;
  /**
   * Generate mock list UUID with list prefix
   */
  static generateListUUID(identifier?: string): string;
  /**
   * Generate a truly random UUID v4
   */
  private static generateRandomUUID;
  /**
   * Reset seed counter for test isolation
   */
  static resetSeedCounter(): void;
  /**
   * Validate that generated UUID meets requirements
   */
  static validateGeneratedUUID(uuid: string): boolean;
  /**
   * Performance benchmark for UUID generation
   */
  static benchmarkGeneration(iterations?: number): {
    averageTime: number;
    totalTime: number;
    iterations: number;
  };
  /**
   * Private helper to generate hex string from seed
   */
  private static generateHexFromSeed;
}
/**
 * Performance-optimized UUID generation for high-volume testing
 */
export declare class PerformanceUUIDGenerator {
  private static uuidPool;
  private static poolIndex;
  private static readonly POOL_SIZE;
  /**
   * Pre-generate UUID pool for high-performance testing
   */
  static initializePool(): void;
  /**
   * Get next UUID from pre-generated pool
   */
  static getNextUUID(): string;
  /**
   * Reset pool for test isolation
   */
  static resetPool(): void;
}
/**
 * Example UUIDs for documentation and testing
 */
export declare const MockUUIDExamples: {
  COMPANY: string;
  PERSON: string;
  TASK: string;
  LIST: string;
  VALID_FORMAT: string[];
};
//# sourceMappingURL=uuid-mock-generator.d.ts.map
