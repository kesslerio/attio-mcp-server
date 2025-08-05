/**
 * Export all prompt templates
 */
import type { PromptTemplate } from '../types.js';
import companiesPrompts from './companies.js';
import listsPrompts from './lists.js';
import notesPrompts from './notes.js';
import peoplePrompts from './people.js';

/**
 * All available prompt templates
 */
export const allPrompts: PromptTemplate[] = [
  ...peoplePrompts,
  ...companiesPrompts,
  ...listsPrompts,
  ...notesPrompts,
];

/**
 * Get all prompts
 *
 * @returns Array of all prompt templates
 */
export function getAllPrompts(): PromptTemplate[] {
  return allPrompts;
}

/**
 * Get prompts by category
 *
 * @param category - Category to filter by
 * @returns Array of prompt templates in the specified category
 */
export function getPromptsByCategory(category: string): PromptTemplate[] {
  return allPrompts.filter((prompt) => prompt.category === category);
}

/**
 * Get prompt by ID
 *
 * @param id - ID of the prompt to retrieve
 * @returns Prompt template with the specified ID, or undefined if not found
 */
export function getPromptById(id: string): PromptTemplate | undefined {
  return allPrompts.find((prompt) => prompt.id === id);
}

/**
 * Get all available prompt categories
 *
 * @returns Array of unique category names
 */
export function getAllCategories(): string[] {
  const categories = new Set<string>();

  allPrompts.forEach((prompt) => {
    categories.add(prompt.category);
  });

  return Array.from(categories);
}

export default {
  getAllPrompts,
  getPromptsByCategory,
  getPromptById,
  getAllCategories,
};
