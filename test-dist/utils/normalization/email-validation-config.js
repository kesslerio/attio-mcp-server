/**
 * Email Validation Configuration
 *
 * Provides configurable email validation behavior to support backward compatibility
 * while transitioning to stricter validation.
 */
/**
 * Email validation mode options
 */
export var EmailValidationMode;
(function (EmailValidationMode) {
    /** Strict mode: Throw errors for invalid emails (default, recommended) */
    EmailValidationMode["STRICT"] = "strict";
    /** Legacy mode: Silently skip invalid emails (backward compatibility) */
    EmailValidationMode["LEGACY"] = "legacy";
    /** Warn mode: Log warnings for invalid emails but don't throw (transition mode) */
    EmailValidationMode["WARN"] = "warn";
})(EmailValidationMode || (EmailValidationMode = {}));
/**
 * Default email validation configuration
 */
export const DEFAULT_EMAIL_VALIDATION_CONFIG = {
    mode: EmailValidationMode.STRICT,
    logDeprecationWarnings: true,
    logger: (message, level) => {
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
export const LEGACY_EMAIL_VALIDATION_CONFIG = {
    mode: EmailValidationMode.LEGACY,
    logDeprecationWarnings: true,
    logger: (message, level) => {
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
export const WARN_EMAIL_VALIDATION_CONFIG = {
    mode: EmailValidationMode.WARN,
    logDeprecationWarnings: false, // Warnings are already being generated
    logger: (message, level) => {
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
export function getEmailValidationConfig(explicitMode) {
    // Allow environment variable override for easier migration
    const envMode = process.env.EMAIL_VALIDATION_MODE;
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
