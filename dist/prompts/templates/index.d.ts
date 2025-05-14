/**
 * Export all prompt templates
 */
import { PromptTemplate } from '../types.js';
/**
 * All available prompt templates
 */
export declare const allPrompts: PromptTemplate[];
/**
 * Get all prompts
 *
 * @returns Array of all prompt templates
 */
export declare function getAllPrompts(): PromptTemplate[];
/**
 * Get prompts by category
 *
 * @param category - Category to filter by
 * @returns Array of prompt templates in the specified category
 */
export declare function getPromptsByCategory(category: string): PromptTemplate[];
/**
 * Get prompt by ID
 *
 * @param id - ID of the prompt to retrieve
 * @returns Prompt template with the specified ID, or undefined if not found
 */
export declare function getPromptById(id: string): PromptTemplate | undefined;
/**
 * Get all available prompt categories
 *
 * @returns Array of unique category names
 */
export declare function getAllCategories(): string[];
declare const _default: {
    getAllPrompts: typeof getAllPrompts;
    getPromptsByCategory: typeof getPromptsByCategory;
    getPromptById: typeof getPromptById;
    getAllCategories: typeof getAllCategories;
};
export default _default;
//# sourceMappingURL=index.d.ts.map