/**
 * Tests for CLI color utilities
 */
import { describe, expect, it } from 'vitest';
import {
  type ColorName,
  colorize,
  colors,
} from '../../src/utils/cli-colors.js';

describe('CLI Colors Utility', () => {
  describe('colorize function', () => {
    it('should apply color codes to text', () => {
      const result = colorize('Hello', 'red');
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
        const result = colorize('test', color);
        expect(result).toContain('test');
        expect(result).toContain('\x1b[0m'); // Reset code
      });
    });

    it('should handle empty text', () => {
      const result = colorize('', 'green');
      expect(result).toBe('\x1b[32m\x1b[0m');
    });

    it('should handle special characters', () => {
      const result = colorize('🎉 Success!', 'green');
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
      const expectedColors = [
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
