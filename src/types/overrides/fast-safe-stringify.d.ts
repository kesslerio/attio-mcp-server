/**
 * Type declarations for fast-safe-stringify
 * https://github.com/davidmarkclements/fast-safe-stringify
 */

declare module 'fast-safe-stringify' {
  /**
   * A function that safely stringifies objects with circular references.
   */
  function stringify(
    obj: any,
    replacer?: (key: string, value: any) => any,
    space?: string | number
  ): string;

  namespace stringify {
    /**
     * A deterministic (stable) version of the stringify function.
     */
    export function stable(
      obj: any,
      replacer?: (key: string, value: any) => any,
      space?: string | number
    ): string;

    /**
     * Alias for stable.
     */
    export function stableStringify(
      obj: any,
      replacer?: (key: string, value: any) => any,
      space?: string | number
    ): string;
  }

  export = stringify;
}
