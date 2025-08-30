/**
 * Tests for CLI color utilities
 */
import { describe, it, expect } from 'vitest';

import { colorize, colors, type ColorName } from '../../../src/utils/cli-colors.js';

describe('CLI Colors Utility', () => {
  describe('colorize function', () => {
    it('should apply color codes to text', () => {
      expect(result).toBe('\x1b[31mHello\x1b[0m');
    });

    it('should handle all available colors', () => {
      const colorNames: ColorName[] = [
        'red',
        'green',
        'yellow',
        'blue',
        'cyan',
        'white',
        'bold',
        'reset',
      ];

      colorNames.forEach((color) => {
        expect(result).toContain('test');
        expect(result).toContain('\x1b[0m'); // Reset code
      });
    });

    it('should handle empty text', () => {
      expect(result).toBe('\x1b[32m\x1b[0m');
    });

    it('should handle special characters', () => {
      expect(result).toBe('\x1b[32m🎉 Success!\x1b[0m');
    });
  });

  describe('colors export', () => {
    it('should export color codes object', () => {
      expect(colors).toBeDefined();
      expect(colors.red).toBe('\x1b[31m');
      expect(colors.green).toBe('\x1b[32m');
      expect(colors.reset).toBe('\x1b[0m');
    });

    it('should have all expected color properties', () => {
        'red',
        'green',
        'yellow',
        'blue',
        'cyan',
        'white',
        'reset',
        'bold',
      ];

      expectedColors.forEach((color) => {
        expect(colors).toHaveProperty(color);
        expect(typeof colors[color as keyof typeof colors]).toBe('string');
      });
    });
  });
});
