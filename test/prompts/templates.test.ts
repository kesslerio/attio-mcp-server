/**
 * Tests for prompt templates
 */
import {
  getAllCategories,
  getAllPrompts,
  getPromptById,
  getPromptsByCategory,
} from '../../src/prompts/templates/index';
import { PromptTemplate } from '../../src/prompts/types';

describe('Prompt Templates', () => {
  // Test getAllPrompts
  describe('getAllPrompts', () => {
    it('should return all prompts from the registry', () => {
      const prompts = getAllPrompts();

      // Basic validation
      expect(prompts).toBeDefined();
      expect(Array.isArray(prompts)).toBe(true);
      expect(prompts.length).toBeGreaterThan(0);

      // Validate each prompt has required fields
      prompts.forEach((prompt) => {
        expect(prompt.id).toBeDefined();
        expect(prompt.title).toBeDefined();
        expect(prompt.description).toBeDefined();
        expect(prompt.category).toBeDefined();
        expect(prompt.parameters).toBeDefined();
        expect(prompt.template).toBeDefined();
      });
    });
  });

  // Test getPromptById
  describe('getPromptById', () => {
    it('should return a specific prompt by ID', () => {
      // Get the first prompt from all prompts
      const allPrompts = getAllPrompts();
      const firstPrompt = allPrompts[0];

      // Get the same prompt by ID
      const prompt = getPromptById(firstPrompt.id);

      // Validate the prompt
      expect(prompt).toBeDefined();
      expect(prompt?.id).toBe(firstPrompt.id);
      expect(prompt?.title).toBe(firstPrompt.title);
      expect(prompt?.description).toBe(firstPrompt.description);
    });

    it('should return undefined for non-existent prompt ID', () => {
      const prompt = getPromptById('non-existent-prompt');

      expect(prompt).toBeUndefined();
    });
  });

  // Test getPromptsByCategory
  describe('getPromptsByCategory', () => {
    it('should return prompts filtered by category', () => {
      // Get all available categories
      const categories = getAllCategories();

      // Test each category has prompts
      categories.forEach((category) => {
        const prompts = getPromptsByCategory(category);
        expect(prompts.length).toBeGreaterThan(0);

        // Validate all prompts in the category have the correct category
        prompts.forEach((prompt) => expect(prompt.category).toBe(category));
      });
    });

    it('should return an empty array for non-existent category', () => {
      const prompts = getPromptsByCategory('non-existent-category');

      expect(prompts).toBeDefined();
      expect(Array.isArray(prompts)).toBe(true);
      expect(prompts.length).toBe(0);
    });
  });

  // Test getAllCategories
  describe('getAllCategories', () => {
    it('should return all unique categories', () => {
      const categories = getAllCategories();

      // Basic validation
      expect(categories).toBeDefined();
      expect(Array.isArray(categories)).toBe(true);
      expect(categories.length).toBeGreaterThan(0);

      // Make sure the expected categories are present
      expect(categories).toContain('people');
      expect(categories).toContain('companies');
      expect(categories).toContain('lists');

      // Check for duplicates
      const uniqueCategories = [...new Set(categories)];
      expect(uniqueCategories.length).toBe(categories.length);
    });
  });
});
