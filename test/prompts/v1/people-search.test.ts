/**
 * Unit tests for people_search.v1 prompt
 */

import { describe, it, expect } from 'vitest';
import {
  peopleSearchPrompt,
  buildPeopleSearchMessages,
  PeopleSearchArgs,
} from '@/prompts/v1/people-search.v1.js';
import { calculatePromptTokens } from '@/prompts/v1/utils/token-metadata.js';

describe('people_search.v1', () => {
  describe('metadata', () => {
    it('should have correct prompt name and metadata', () => {
      expect(peopleSearchPrompt.metadata.name).toBe('people_search.v1');
      expect(peopleSearchPrompt.metadata.title).toBe('Find people');
      expect(peopleSearchPrompt.metadata.category).toBe('search');
      expect(peopleSearchPrompt.metadata.version).toBe('v1');
    });

    it('should have description within 140 char limit', () => {
      expect(
        peopleSearchPrompt.metadata.description.length
      ).toBeLessThanOrEqual(140);
    });

    it('should have token budget of 500', () => {
      expect(peopleSearchPrompt.tokenBudget).toBe(500);
    });
  });

  describe('argument validation', () => {
    it('should parse valid arguments with defaults', () => {
      const args = {
        query: 'AE in fintech',
      };

      const validated = PeopleSearchArgs.parse(args);
      expect(validated.query).toBe('AE in fintech');
      expect(validated.limit).toBe(25); // default
      expect(validated.format).toBe('table'); // default
      expect(validated.fields_preset).toBe('sales_short'); // default
      expect(validated.verbosity).toBe('brief'); // default
    });

    it('should parse valid arguments with custom values', () => {
      const args = {
        query: 'VP Sales in SF',
        limit: 50,
        format: 'json' as const,
        fields_preset: 'full' as const,
        verbosity: 'normal' as const,
      };

      const validated = PeopleSearchArgs.parse(args);
      expect(validated.query).toBe('VP Sales in SF');
      expect(validated.limit).toBe(50);
      expect(validated.format).toBe('json');
      expect(validated.fields_preset).toBe('full');
      expect(validated.verbosity).toBe('normal');
    });

    it('should reject query that is too short', () => {
      const args = {
        query: 'ab', // too short
      };

      expect(() => PeopleSearchArgs.parse(args)).toThrow();
    });

    it('should reject limit above maximum', () => {
      const args = {
        query: 'AE in fintech',
        limit: 150, // exceeds max of 100
      };

      expect(() => PeopleSearchArgs.parse(args)).toThrow();
    });

    it('should reject invalid format enum', () => {
      const args = {
        query: 'AE in fintech',
        format: 'invalid' as any,
      };

      expect(() => PeopleSearchArgs.parse(args)).toThrow();
    });
  });

  describe('message building', () => {
    it('should build messages with default arguments', () => {
      const args = {
        query: 'AE in fintech',
      };

      const messages = buildPeopleSearchMessages(args);

      expect(messages).toHaveLength(1);
      expect(messages[0].role).toBe('user');
      expect(messages[0].content.type).toBe('text');
      expect((messages[0].content as any).text).toContain('records_query');
      expect((messages[0].content as any).text).toContain('AE in fintech');
      expect((messages[0].content as any).text).toContain('format=table');
    });

    it('should build messages with custom format', () => {
      const args = {
        query: 'VP Sales',
        format: 'json' as const,
      };

      const messages = buildPeopleSearchMessages(args);

      expect((messages[0].content as any).text).toContain('format=json');
    });

    it('should build messages with custom limit', () => {
      const args = {
        query: 'Directors',
        limit: 50,
      };

      const messages = buildPeopleSearchMessages(args);

      expect((messages[0].content as any).text).toContain('max 50');
    });
  });

  describe('token budget compliance', () => {
    it('should stay within 500 token budget for default args', () => {
      const args = {
        query: 'Account Executives in San Francisco at fintech companies',
      };

      const messages = buildPeopleSearchMessages(args);
      const tokenMetadata = calculatePromptTokens(messages);

      expect(tokenMetadata.estimated_tokens).toBeLessThanOrEqual(500);
    });

    it('should stay within budget for various query lengths', () => {
      const queries = [
        'AE role',
        'Account Executive',
        'VP Sales in enterprise SaaS companies',
        'Chief Technology Officer with AI/ML experience in Series B startups',
      ];

      for (const query of queries) {
        const messages = buildPeopleSearchMessages({ query });
        const tokenMetadata = calculatePromptTokens(messages);

        expect(tokenMetadata.estimated_tokens).toBeLessThanOrEqual(500);
      }
    });
  });

  describe('argument definitions', () => {
    it('should have all required argument definitions', () => {
      const argNames = peopleSearchPrompt.arguments.map((a) => a.name);

      expect(argNames).toContain('query');
      expect(argNames).toContain('limit');
      expect(argNames).toContain('format');
      expect(argNames).toContain('fields_preset');
      expect(argNames).toContain('verbosity');
    });

    it('should have argument descriptions within 80 char limit', () => {
      for (const arg of peopleSearchPrompt.arguments) {
        expect(arg.description.length).toBeLessThanOrEqual(80);
      }
    });

    it('should mark only query as required', () => {
      const requiredArgs = peopleSearchPrompt.arguments.filter(
        (a) => a.required
      );
      expect(requiredArgs).toHaveLength(1);
      expect(requiredArgs[0].name).toBe('query');
    });
  });
});
