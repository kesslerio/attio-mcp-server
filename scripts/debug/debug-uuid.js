// Debug script to isolate UUID generation issue

// Replicate the UUID generation logic from the mock factory
class DebugUUIDGenerator {
  static seedCounter = 0;
  
  static generateDeterministicUUID(seed) {
    const seedValue = seed || `perf-test-${this.seedCounter++}`;
    
    // Simple hash function for deterministic hex generation
    let hash = 0;
    for (let i = 0; i < seedValue.length; i++) {
      const char = seedValue.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    // Convert hash to hex string and pad - DEMONSTRATE THE BUG
    const hexSeedBroken = Math.abs(hash).toString(16).padStart(8, '0');
    const hexSeedFixed = Math.abs(hash).toString(16).padStart(8, '0').slice(-8);
    console.log(`Seed: ${seedValue} -> Hash: ${hash}`);
    console.log(`  Broken HexSeed: ${hexSeedBroken} (length: ${hexSeedBroken.length})`);
    console.log(`  Fixed HexSeed: ${hexSeedFixed} (length: ${hexSeedFixed.length})`);
    
    const hexSeed = hexSeedBroken; // Use broken version to replicate issue
    
    // Generate deterministic UUID parts
    const timestamp = Math.floor(Date.now() / 1000).toString(16).padStart(8, '0');
    const random1 = this.generateHexFromSeed(seedValue + 'a', 4);
    const random2 = this.generateHexFromSeed(seedValue + 'b', 4);
    const random3 = this.generateHexFromSeed(seedValue + 'c', 4);
    const random4 = this.generateHexFromSeed(seedValue + 'd', 12);
    
    console.log(`Parts: ${hexSeed}(${hexSeed.length}) - ${random1}(${random1.length}) - 4${random2.slice(1)} - 8${random3.slice(1)} - ${random4}(${random4.length})`);
    
    // Format as UUID v4 (set version and variant bits)
    const version = '4'; // UUID v4
    const variant = '8'; // Variant 10xx
    
    const finalUUID = `${hexSeed}-${random1}-${version}${random2.slice(1)}-${variant}${random3.slice(1)}-${random4}`;
    console.log(`Final UUID: ${finalUUID} (length: ${finalUUID.length})`);
    
    return finalUUID;
  }
  
  static generateCompanyUUID(identifier) {
    const seed = identifier ? `company-${identifier}` : `company-${Date.now()}`;
    return this.generateDeterministicUUID(seed);
  }
  
  static generateHexFromSeed(seed, length) {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      const char = seed.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    
    let hex = Math.abs(hash).toString(16);
    while (hex.length < length) {
      hash = ((hash << 5) - hash) + hash;
      hash = hash & hash;
      hex += Math.abs(hash).toString(16);
    }
    
    const result = hex.slice(0, length);
    console.log(`  generateHexFromSeed(${seed}, ${length}) -> ${result} (length: ${result.length})`);
    return result;
  }
}

// Test the UUID generation exactly as performance test does
console.log('=== Testing UUID Generation ===');

for (let i = 0; i < 3; i++) {
  console.log(`\n--- Test ${i + 1} ---`);
  const uuid = DebugUUIDGenerator.generateCompanyUUID();
  
  // Validate format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const isValid = uuidRegex.test(uuid);
  
  console.log(`Generated: ${uuid}`);
  console.log(`Length: ${uuid.length} (expected: 36)`);
  console.log(`Valid: ${isValid}`);
  
  if (!isValid) {
    console.log('VALIDATION DETAILS:');
    console.log(`  Char 8: '${uuid.charAt(8)}' (expected: '-')`);
    console.log(`  Char 13: '${uuid.charAt(13)}' (expected: '-')`);
    console.log(`  Char 18: '${uuid.charAt(18)}' (expected: '-')`);
    console.log(`  Char 23: '${uuid.charAt(23)}' (expected: '-')`);
    
    const segments = uuid.split('-');
    console.log(`  Segments: [${segments.map(s => `${s}(${s.length})`).join(', ')}]`);
  }
}