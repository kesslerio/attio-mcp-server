/**
 * Email Validation Configuration
 *
 * Provides configurable email validation behavior to support backward compatibility
 * while transitioning to stricter validation.
 */

/**
 * Email validation mode options
 */
export enum EmailValidationMode {
  /** Strict mode: Throw errors for invalid emails (default, recommended) */
  STRICT = 'strict',

  /** Legacy mode: Silently skip invalid emails (backward compatibility) */
  LEGACY = 'legacy',

  /** Warn mode: Log warnings for invalid emails but don't throw (transition mode) */
  WARN = 'warn',
}

/**
 * Email validation configuration options
 */
export interface EmailValidationConfig {
  /** Validation mode to use */
  mode: EmailValidationMode;

  /** Whether to log deprecation warnings for legacy mode usage */
  logDeprecationWarnings?: boolean;

  /** Custom logger function for warnings */
  logger?: (message: string, level: 'warn' | 'error' | 'info') => void;
}

/**
 * Default email validation configuration
 */
export const DEFAULT_EMAIL_VALIDATION_CONFIG: EmailValidationConfig = {
  mode: EmailValidationMode.STRICT,
  logDeprecationWarnings: true,
  logger: (message: string, level: string) => {
    if (typeof console !== 'undefined') {
      switch (level) {
        case 'warn':
          console.warn(message);
          break;
        case 'error':
          console.error(message);
          break;
        case 'info':
          console.info(message);
          break;
        default:
          console.error(message);
      }
    }
  },
};

/**
 * Legacy email validation configuration for backward compatibility
 */
export const LEGACY_EMAIL_VALIDATION_CONFIG: EmailValidationConfig = {
  mode: EmailValidationMode.LEGACY,
  logDeprecationWarnings: true,
  logger: (message: string, level: string) => {
    if (typeof console !== 'undefined') {
      switch (level) {
        case 'warn':
          console.warn(message);
          break;
        case 'error':
          console.error(message);
          break;
        case 'info':
          console.info(message);
          break;
        default:
          console.error(message);
      }
    }
  },
};

/**
 * Warn mode configuration for gradual migration
 */
export const WARN_EMAIL_VALIDATION_CONFIG: EmailValidationConfig = {
  mode: EmailValidationMode.WARN,
  logDeprecationWarnings: false, // Warnings are already being generated
  logger: (message: string, level: string) => {
    if (typeof console !== 'undefined') {
      switch (level) {
        case 'warn':
          console.warn(message);
          break;
        case 'error':
          console.error(message);
          break;
        case 'info':
          console.info(message);
          break;
        default:
          console.error(message);
      }
    }
  },
};

/**
 * Get validation config based on environment or explicit mode
 */
export function getEmailValidationConfig(
  explicitMode?: EmailValidationMode
): EmailValidationConfig {
  // Allow environment variable override for easier migration
  const envMode = process.env.EMAIL_VALIDATION_MODE as EmailValidationMode;

  if (explicitMode) {
    return {
      ...DEFAULT_EMAIL_VALIDATION_CONFIG,
      mode: explicitMode,
    };
  }

  if (envMode && Object.values(EmailValidationMode).includes(envMode)) {
    return {
      ...DEFAULT_EMAIL_VALIDATION_CONFIG,
      mode: envMode,
    };
  }

  return DEFAULT_EMAIL_VALIDATION_CONFIG;
}
