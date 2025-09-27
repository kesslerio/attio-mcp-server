import { InvalidCompanyDataError } from '@/errors/company-errors.js';

const LINKEDIN_DOMAIN = 'linkedin.com';

export class LinkedInUrlValidator {
  static validate(rawUrl: string): void {
    try {
      const url = new URL(rawUrl);

      if (!LinkedInUrlValidator.isValidHostname(url.hostname)) {
        throw new InvalidCompanyDataError(
          'LinkedIn URL must be a valid LinkedIn URL'
        );
      }
    } catch (error) {
      if (error instanceof InvalidCompanyDataError) {
        throw error;
      }

      throw new InvalidCompanyDataError('LinkedIn URL must be a valid URL');
    }
  }

  static isValidHostname(hostname: string): boolean {
    const normalizedHostname = hostname.toLowerCase();
    return (
      normalizedHostname === LINKEDIN_DOMAIN ||
      normalizedHostname.endsWith(`.${LINKEDIN_DOMAIN}`)
    );
  }
}
