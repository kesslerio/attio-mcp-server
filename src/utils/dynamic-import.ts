/**
 * Utility for dynamically importing ES modules in a way that's compatible with both ESM and CommonJS
 */

/**
 * Dynamically imports a module in an environment-agnostic way
 * 
 * @param moduleName - Name of the module to import
 * @returns The imported module
 */
export async function dynamicImport(moduleName: string): Promise<any> {
  try {
    return await import(moduleName);
  } catch (error) {
    console.error(`Error importing module ${moduleName}:`, error);
    throw error;
  }
}