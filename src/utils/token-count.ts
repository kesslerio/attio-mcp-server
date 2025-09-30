import {
  encoding_for_model,
  get_encoding,
  type TiktokenEncoding,
  type TiktokenModel,
} from '@dqbd/tiktoken';

const DEFAULT_MODEL = 'claude-3-7-sonnet-20250219';
const DEFAULT_ENCODING: TiktokenEncoding = 'cl100k_base';

const MODEL_TO_ENCODING: Record<string, TiktokenEncoding> = {
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

const encoderCache = new Map<string, ReturnType<typeof encoding_for_model>>();

function resolveEncoding(model: string): TiktokenEncoding {
  return MODEL_TO_ENCODING[model] ?? DEFAULT_ENCODING;
}

function getModelName(model?: string): string {
  return model?.trim() || process.env.COUNT_MODEL_DEFAULT || DEFAULT_MODEL;
}

function getEncoder(model?: string) {
  const modelName = getModelName(model);
  const resolvedEncoding = resolveEncoding(modelName);

  if (encoderCache.has(resolvedEncoding)) {
    return encoderCache.get(resolvedEncoding)!;
  }

  const encoder = (() => {
    try {
      return encoding_for_model(modelName as TiktokenModel);
    } catch {
      return get_encoding(resolvedEncoding as TiktokenEncoding);
    }
  })();

  encoderCache.set(resolvedEncoding, encoder);
  return encoder;
}

export function countTokens(text: string, model?: string): number {
  const encoder = getEncoder(model);
  return encoder.encode(text).length;
}

export function countJsonTokens(value: unknown, model?: string): number {
  const serialized = JSON.stringify(value);
  return countTokens(serialized, model);
}

export function countStrings(tokens: string[], model?: string): number {
  if (!tokens.length) {
    return 0;
  }

  return countTokens(tokens.join('\n'), model);
}

export function getCountModel(): string {
  return getModelName();
}
