import { ResultEncodingError } from '@/handlers/tools/result-contract.js';

/** Decode only after the transport retry scope has ended. A completed write
 * whose response cannot be decoded must never enter a fallback write path. */
export async function decodeMutationResult<T>(
  decode: () => T | Promise<T>
): Promise<T> {
  try {
    const result = await decode();
    if (!result || typeof result !== 'object') throw new ResultEncodingError();
    return result;
  } catch {
    throw new ResultEncodingError();
  }
}
