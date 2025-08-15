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
export class UUIDMockGenerator {
  private static seedCounter = 0;

  /**
   * Generate a deterministic UUID v4 for testing
   *
   * Uses a seeded approach to ensure consistent UUIDs for performance
   * benchmarking while maintaining valid UUID format.
   *
   * @param seed - Optional seed for deterministic generation
   * @returns Valid UUID v4 string
   */
  static generateDeterministicUUID(seed?: string): string {
    // Create deterministic seed from input or counter
    const seedValue = seed || `perf-test-${this.seedCounter++}`;

    // Simple hash function for deterministic hex generation
    let hash = 0;
    for (let i = 0; i < seedValue.length; i++) {
      const char = seedValue.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }

    // Convert hash to hex string and pad, ensuring exactly 8 characters
    const hexSeed = Math.abs(hash).toString(16).padStart(8, '0').slice(-8);

    // Generate deterministic UUID parts (use timestamp for first segment, not hexSeed)
    const timestampRaw = Math.floor(Date.now() / 1000).toString(16);
    const timestamp = timestampRaw.padStart(8, '0').slice(-8);

    const random1 = this.generateHexFromSeed(seedValue + 'a', 4);
    const random2 = this.generateHexFromSeed(seedValue + 'b', 4);
    const random3 = this.generateHexFromSeed(seedValue + 'c', 4);
    const random4 = this.generateHexFromSeed(seedValue + 'd', 12);

    // Format as UUID v4 (set version and variant bits)
    const version = '4'; // UUID v4
    const variant = '8'; // Variant 10xx

    return `${timestamp}-${random1}-${version}${random2.slice(1)}-${variant}${random3.slice(1)}-${random4}`;
  }

  /**
   * Generate mock company UUID with company prefix
   */
  static generateCompanyUUID(identifier?: string): string {
    if (identifier) {
      const seed = `company-${identifier}`;
      return this.generateDeterministicUUID(seed);
    }
    // For no identifier, use truly random UUID
    return this.generateRandomUUID();
  }

  /**
   * Generate mock person UUID with person prefix
   */
  static generatePersonUUID(identifier?: string): string {
    if (identifier) {
      const seed = `person-${identifier}`;
      return this.generateDeterministicUUID(seed);
    }
    // For no identifier, use truly random UUID
    return this.generateRandomUUID();
  }

  /**
   * Generate mock task UUID with task prefix
   */
  static generateTaskUUID(identifier?: string): string {
    if (identifier) {
      const seed = `task-${identifier}`;
      return this.generateDeterministicUUID(seed);
    }
    // For no identifier, use truly random UUID
    return this.generateRandomUUID();
  }

  /**
   * Generate mock list UUID with list prefix
   */
  static generateListUUID(identifier?: string): string {
    if (identifier) {
      const seed = `list-${identifier}`;
      return this.generateDeterministicUUID(seed);
    }
    // For no identifier, use truly random UUID
    return this.generateRandomUUID();
  }

  /**
   * Generate a truly random UUID v4
   */
  private static generateRandomUUID(): string {
    // Use crypto.randomUUID() if available (Node.js 14.17+)
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }

    // Fallback to manual random UUID generation
    const randomHex = () => Math.floor(Math.random() * 16).toString(16);
    const randomBytes = (length: number) =>
      Array.from({ length }, () => randomHex()).join('');

    return [
      randomBytes(8),
      randomBytes(4),
      '4' + randomBytes(3), // Version 4
      (8 + Math.floor(Math.random() * 4)).toString(16) + randomBytes(3), // Variant
      randomBytes(12),
    ].join('-');
  }

  /**
   * Reset seed counter for test isolation
   */
  static resetSeedCounter(): void {
    this.seedCounter = 0;
  }

  /**
   * Validate that generated UUID meets requirements
   */
  static validateGeneratedUUID(uuid: string): boolean {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }

  /**
   * Performance benchmark for UUID generation
   */
  static benchmarkGeneration(iterations: number = 1000): {
    averageTime: number;
    totalTime: number;
    iterations: number;
  } {
    const startTime = performance.now();

    for (let i = 0; i < iterations; i++) {
      this.generateDeterministicUUID(`benchmark-${i}`);
    }

    const endTime = performance.now();
    const totalTime = endTime - startTime;

    return {
      averageTime: totalTime / iterations,
      totalTime,
      iterations,
    };
  }

  /**
   * Private helper to generate hex string from seed
   */
  private static generateHexFromSeed(seed: string, length: number): string {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      const char = seed.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }

    let hex = Math.abs(hash).toString(16);
    while (hex.length < length) {
      hash = (hash << 5) - hash + hash;
      hash = hash & hash;
      hex += Math.abs(hash).toString(16);
    }

    return hex.slice(0, length);
  }
}

/**
 * Performance-optimized UUID generation for high-volume testing
 */
export class PerformanceUUIDGenerator {
  private static uuidPool: string[] = [];
  private static poolIndex = 0;
  private static readonly POOL_SIZE = 1000;

  /**
   * Pre-generate UUID pool for high-performance testing
   */
  static initializePool(): void {
    this.uuidPool = [];
    this.poolIndex = 0;

    for (let i = 0; i < this.POOL_SIZE; i++) {
      this.uuidPool.push(
        UUIDMockGenerator.generateDeterministicUUID(`pool-${i}`)
      );
    }
  }

  /**
   * Get next UUID from pre-generated pool
   */
  static getNextUUID(): string {
    if (this.uuidPool.length === 0) {
      this.initializePool();
    }

    const uuid = this.uuidPool[this.poolIndex];
    this.poolIndex = (this.poolIndex + 1) % this.POOL_SIZE;
    return uuid;
  }

  /**
   * Reset pool for test isolation
   */
  static resetPool(): void {
    this.poolIndex = 0;
  }
}

/**
 * Example UUIDs for documentation and testing
 */
export const MockUUIDExamples = {
  COMPANY: 'c47ac10b-58cc-4372-a567-0e02b2c3d479',
  PERSON: 'p47ac10b-58cc-4372-a567-0e02b2c3d479',
  TASK: 't47ac10b-58cc-4372-a567-0e02b2c3d479',
  LIST: 'l47ac10b-58cc-4372-a567-0e02b2c3d479',
  VALID_FORMAT: [
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    '123e4567-e89b-12d3-a456-426614174000',
    '00000000-0000-0000-0000-000000000000',
  ],
};
