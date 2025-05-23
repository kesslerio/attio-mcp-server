import fs from 'fs';
import path from 'path';

export interface FieldMapping {
  primary_field: string;
  fallback_field?: string;
}

export interface FieldMappingConfig {
  [objectType: string]: Record<string, FieldMapping>;
}

const CONFIG_PATH = path.resolve(process.cwd(), 'config/field-mappings.json');

let cachedConfig: FieldMappingConfig | null = null;

function loadConfig(): FieldMappingConfig {
  if (!cachedConfig) {
    try {
      if (fs.existsSync(CONFIG_PATH)) {
        const data = fs.readFileSync(CONFIG_PATH, 'utf8');
        cachedConfig = JSON.parse(data) as FieldMappingConfig;
      } else {
        cachedConfig = {};
      }
    } catch {
      cachedConfig = {};
    }
  }
  return cachedConfig;
}

export function invalidateFieldMappingCache(): void {
  cachedConfig = null;
}

export function getFieldMapping(
  objectType: string,
  field: string
): FieldMapping | undefined {
  const config = loadConfig();
  const objectMappings = config[objectType];
  if (!objectMappings) return undefined;
  return objectMappings[field];
}
