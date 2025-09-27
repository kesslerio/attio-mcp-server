import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CompanyValidator } from '@/validators/company-validator.js';
import { InvalidCompanyDataError } from '@/errors/company-errors.js';
import {
  detectFieldType,
  getAttributeTypeInfo,
} from '@/api/attribute-types.js';

vi.mock('@/api/attribute-types.js', () => ({
  getAttributeTypeInfo: vi.fn(),
  getFieldValidationRules: vi.fn(),
  detectFieldType: vi.fn(),
}));

const mockStringAttributeMetadata = {
  fieldType: 'string',
  isArray: false,
  isRequired: false,
  isUnique: false,
  attioType: 'text',
  metadata: {},
};

describe('CompanyValidator LinkedIn URL validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    CompanyValidator.clearFieldTypeCache();

    (getAttributeTypeInfo as vi.Mock).mockResolvedValue(
      mockStringAttributeMetadata
    );
    (detectFieldType as vi.Mock).mockResolvedValue('string');
  });

  const createAttributes = (linkedinUrl: string) => ({
    name: 'Safe Corp',
    linkedin_url: linkedinUrl,
  });

  it('allows LinkedIn domains during company creation', async () => {
    const attributes = createAttributes(
      'https://www.linkedin.com/company/safe-corp'
    );

    const result = await CompanyValidator.validateCreate(attributes);

    expect(result.linkedin_url).toBe(attributes.linkedin_url);
  });

  it('allows legitimate LinkedIn subdomains', async () => {
    const subdomainUrls = [
      'https://mobile.linkedin.com/company/safe-corp',
      'https://touch.linkedin.com/company/safe-corp',
    ];

    const results = await Promise.all(
      subdomainUrls.map((url) =>
        CompanyValidator.validateCreate(createAttributes(url))
      )
    );

    results.forEach((validated, index) => {
      expect(validated.linkedin_url).toBe(subdomainUrls[index]);
    });
  });

  it('rejects spoofed LinkedIn domains during company creation', async () => {
    const promise = CompanyValidator.validateCreate(
      createAttributes('https://linkedin.com.evil.com/company/spoof-corp')
    );

    await expect(promise).rejects.toThrow(InvalidCompanyDataError);
    await expect(promise).rejects.toThrow(
      'LinkedIn URL must be a valid LinkedIn URL'
    );
  });

  it('rejects non-LinkedIn domains with linkedin in subdomain', async () => {
    const promise = CompanyValidator.validateCreate(
      createAttributes('https://evil.linkedin.attacker.com/path')
    );

    await expect(promise).rejects.toThrow(InvalidCompanyDataError);
    await expect(promise).rejects.toThrow(
      'LinkedIn URL must be a valid LinkedIn URL'
    );
  });

  it('rejects malformed LinkedIn URLs', async () => {
    const promise = CompanyValidator.validateCreate(
      createAttributes('not-a-url')
    );

    await expect(promise).rejects.toThrow(InvalidCompanyDataError);
    await expect(promise).rejects.toThrow('LinkedIn URL must be a valid URL');
  });

  it('rejects spoofed LinkedIn domains during attribute updates', async () => {
    const promise = CompanyValidator.validateAttributeUpdate(
      'comp_123',
      'linkedin_url',
      'https://linkedin.com.attacker.com/profile'
    );

    await expect(promise).rejects.toThrow(InvalidCompanyDataError);
    await expect(promise).rejects.toThrow(
      'LinkedIn URL must be a valid LinkedIn URL'
    );
  });

  it('allows LinkedIn domains during attribute updates', async () => {
    const result = await CompanyValidator.validateAttributeUpdate(
      'comp_123',
      'linkedin_url',
      'https://linkedin.com/company/valid'
    );

    expect(result).toBe('https://linkedin.com/company/valid');
  });
});
