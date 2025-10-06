/**
 * Unit tests for v1 prompts validation utilities
 */

import { describe, it, expect } from 'vitest';
import {
  checkTokenBudget,
  createBudgetExceededError,
} from '@/prompts/v1/utils/validation.js';
import { PromptMessage } from '@/prompts/v1/types.js';

describe('Token Budget Validation', () => {
  describe('checkTokenBudget', () => {
    it('should pass when exactly at budget limit', async () => {
      // Create a message that's approximately 500 tokens
      // Rough estimate: 1 token ≈ 4 characters for English text
      const text = 'a'.repeat(2000); // ~500 tokens
      const messages: PromptMessage[] = [
        {
          role: 'user',
          content: {
            type: 'text',
            text,
          },
        },
      ];

      const result = await checkTokenBudget('people_search.v1', messages);

      // Should be within budget (people_search.v1 has 500 token limit)
      expect(result.withinBudget).toBe(true);
      expect(result.budgetLimit).toBe(500);
      expect(result.exceededBy).toBeUndefined();
    });

    it('should fail when exceeding budget limit', async () => {
      // Create a message that definitely exceeds 500 tokens
      // Using varied text to avoid compression in tokenization
      const longText = Array.from(
        { length: 200 },
        (_, i) =>
          `This is sentence number ${i} with varied content to ensure proper tokenization.`
      ).join(' ');

      const messages: PromptMessage[] = [
        {
          role: 'user',
          content: {
            type: 'text',
            text: longText,
          },
        },
      ];

      const result = await checkTokenBudget('people_search.v1', messages);

      expect(result.withinBudget).toBe(false);
      expect(result.budgetLimit).toBe(500);
      expect(result.exceededBy).toBeGreaterThan(0);
      expect(result.estimatedTokens).toBeGreaterThan(500);
    });

    it('should return proper budget limit for different prompts', async () => {
      const messages: PromptMessage[] = [
        {
          role: 'user',
          content: {
            type: 'text',
            text: 'short text',
          },
        },
      ];

      // Test different prompt budgets
      const searchResult = await checkTokenBudget('people_search.v1', messages);
      expect(searchResult.budgetLimit).toBe(500);

      const qualifyResult = await checkTokenBudget('qualify_lead.v1', messages);
      expect(qualifyResult.budgetLimit).toBe(400);

      const logResult = await checkTokenBudget('log_activity.v1', messages);
      expect(logResult.budgetLimit).toBe(300);
    });
  });

  describe('createBudgetExceededError', () => {
    it('should create proper JSON-RPC error structure', () => {
      const budgetResult = {
        withinBudget: false,
        estimatedTokens: 650,
        budgetLimit: 500,
        exceededBy: 150,
      };

      const error = createBudgetExceededError(budgetResult);

      expect(error.code).toBe(-32602); // JSON-RPC Invalid params
      expect(error.message).toContain('650 tokens');
      expect(error.message).toContain('limit: 500');
      expect(error.data).toEqual({
        estimatedTokens: 650,
        budgetLimit: 500,
        exceededBy: 150,
      });
    });

    it('should handle zero exceededBy gracefully', () => {
      const budgetResult = {
        withinBudget: false,
        estimatedTokens: 500,
        budgetLimit: 500,
        exceededBy: undefined,
      };

      const error = createBudgetExceededError(budgetResult);

      expect(error.code).toBe(-32602);
      expect(error.data?.exceededBy).toBe(0);
    });
  });
});
