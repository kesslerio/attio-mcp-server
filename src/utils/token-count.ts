/**
 * Lazy-loaded tiktoken types to avoid bundling WASM at module load time
 */
type TiktokenEncoding = 'cl100k_base' | 'p50k_base' | 'r50k_base' | 'gpt2';
type TiktokenModel = string;

const DEFAULT_MODEL = 'claude-sonnet-4-5';
const DEFAULT_ENCODING: TiktokenEncoding = 'cl100k_base';

const MODEL_TO_ENCODING: Record<string, TiktokenEncoding> = {
  'claude-sonnet-4-5': DEFAULT_ENCODING,
  'claude-3-7-sonnet-20250219': DEFAULT_ENCODING,
  'claude-3-5-sonnet-20240620': DEFAULT_ENCODING,
  'claude-3-opus-20240229': DEFAULT_ENCODING,
  'claude-3-sonnet-20240229': DEFAULT_ENCODING,
  'claude-3-haiku-20240307': DEFAULT_ENCODING,
  'gpt-4o': DEFAULT_ENCODING,
  'gpt-4o-mini': DEFAULT_ENCODING,
  'gpt-4-turbo': DEFAULT_ENCODING,
  'gpt-3.5-turbo': DEFAULT_ENCODING,
};

/**
 * Cache for loaded tiktoken library (lazy loaded)
 */
let tiktokenLib: typeof import('@dqbd/tiktoken') | null | 'unavailable' = null;

/**
 * Encoder cache for when tiktoken is available
 */
const encoderCache = new Map<string, any>();

/**
 * Fallback token estimation (industry standard: ~4 chars per token)
 */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Lazy load tiktoken library (handles WASM bundling issues gracefully)
 */
async function loadTiktoken(): Promise<typeof import('@dqbd/tiktoken') | null> {
  if (tiktokenLib === 'unavailable') {
    return null;
  }
  if (tiktokenLib !== null) {
    return tiktokenLib;
  }

  try {
    tiktokenLib = await import('@dqbd/tiktoken');
    return tiktokenLib;
  } catch (error) {
    // Mark as unavailable to avoid repeated import attempts
    tiktokenLib = 'unavailable';
    // Silent fallback - estimation will be used
    return null;
  }
}

function resolveEncoding(model: string): TiktokenEncoding {
  return MODEL_TO_ENCODING[model] ?? DEFAULT_ENCODING;
}

function getModelName(model?: string): string {
  return model?.trim() || process.env.COUNT_MODEL_DEFAULT || DEFAULT_MODEL;
}

async function getEncoder(model?: string) {
  const tiktoken = await loadTiktoken();
  if (!tiktoken) {
    return null; // Fallback to estimation
  }

  const modelName = getModelName(model);
  const resolvedEncoding = resolveEncoding(modelName);

  if (encoderCache.has(resolvedEncoding)) {
    return encoderCache.get(resolvedEncoding)!;
  }

  const encoder = (() => {
    try {
      return tiktoken.encoding_for_model(modelName as any);
    } catch {
      return tiktoken.get_encoding(resolvedEncoding);
    }
  })();

  encoderCache.set(resolvedEncoding, encoder);
  return encoder;
}

export async function countTokens(
  text: string,
  model?: string
): Promise<number> {
  const encoder = await getEncoder(model);
  if (!encoder) {
    return estimateTokens(text);
  }
  return encoder.encode(text).length;
}

export async function countJsonTokens(
  value: unknown,
  model?: string
): Promise<number> {
  const serialized = JSON.stringify(value);
  return countTokens(serialized, model);
}

export async function countStrings(
  tokens: string[],
  model?: string
): Promise<number> {
  if (!tokens.length) {
    return 0;
  }

  return countTokens(tokens.join('\n'), model);
}

export function getCountModel(): string {
  return getModelName();
}
