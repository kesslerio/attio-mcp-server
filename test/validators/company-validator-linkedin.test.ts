import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CompanyValidator } from '@/validators/company-validator.js';
import { InvalidCompanyDataError } from '@/errors/company-errors.js';
import {
  getAttributeTypeInfo,
  detectFieldType,
} from '@/api/attribute-types.js';
import type { ProcessedFieldValue } from '@/types/tool-types.js';

vi.mock('@/api/attribute-types.js', () => ({
  getAttributeTypeInfo: vi.fn(),
  getFieldValidationRules: vi.fn(),
  detectFieldType: vi.fn(),
}));

describe('CompanyValidator LinkedIn URL validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    CompanyValidator.clearFieldTypeCache();
  });

  const primeAttributeTypeMocks = (): void => {
    (getAttributeTypeInfo as vi.Mock).mockResolvedValue({
      fieldType: 'string',
      isArray: false,
      isRequired: false,
      isUnique: false,
      attioType: 'text',
      metadata: {},
    });

    (detectFieldType as vi.Mock).mockResolvedValue('string');
  };

  it('allows LinkedIn domains during company creation', async () => {
    primeAttributeTypeMocks();

    const validateFieldTypeSpy = vi
      .spyOn(CompanyValidator as any, 'validateFieldType')
      .mockResolvedValue(undefined);

    const validateAttributeTypesSpy = vi
      .spyOn(CompanyValidator, 'validateAttributeTypes')
      .mockImplementation(
        async (attrs: Record<string, ProcessedFieldValue>) => attrs
      );

    const attributes = {
      name: 'Safe Corp',
      linkedin_url: 'https://www.linkedin.com/company/safe-corp',
    };

    const result = await CompanyValidator.validateCreate(attributes);

    expect(result.linkedin_url).toBe(attributes.linkedin_url);
    expect(validateAttributeTypesSpy).toHaveBeenCalled();

    validateFieldTypeSpy.mockRestore();
    validateAttributeTypesSpy.mockRestore();
  });

  it('rejects spoofed LinkedIn domains during company creation', async () => {
    primeAttributeTypeMocks();

    const validateFieldTypeSpy = vi
      .spyOn(CompanyValidator as any, 'validateFieldType')
      .mockResolvedValue(undefined);

    const validateAttributeTypesSpy = vi
      .spyOn(CompanyValidator, 'validateAttributeTypes')
      .mockImplementation(
        async (attrs: Record<string, ProcessedFieldValue>) => attrs
      );

    const promise = CompanyValidator.validateCreate({
      name: 'Spoof Corp',
      linkedin_url: 'https://linkedin.com.evil.com/company/spoof-corp',
    });

    await expect(promise).rejects.toThrow(InvalidCompanyDataError);
    await expect(promise).rejects.toThrow(
      'LinkedIn URL must be a valid LinkedIn URL'
    );
    expect(validateAttributeTypesSpy).not.toHaveBeenCalled();

    validateFieldTypeSpy.mockRestore();
    validateAttributeTypesSpy.mockRestore();
  });

  it('rejects spoofed LinkedIn domains during attribute updates', async () => {
    primeAttributeTypeMocks();

    const validateFieldTypeSpy = vi
      .spyOn(CompanyValidator as any, 'validateFieldType')
      .mockResolvedValue(undefined);

    const validateAttributeTypesSpy = vi
      .spyOn(CompanyValidator, 'validateAttributeTypes')
      .mockImplementation(
        async (attrs: Record<string, ProcessedFieldValue>) => attrs
      );

    const promise = CompanyValidator.validateAttributeUpdate(
      'comp_123',
      'linkedin_url',
      'https://linkedin.com.attacker.com/profile'
    );

    await expect(promise).rejects.toThrow(InvalidCompanyDataError);
    await expect(promise).rejects.toThrow(
      'LinkedIn URL must be a valid LinkedIn URL'
    );
    expect(validateAttributeTypesSpy).not.toHaveBeenCalled();

    validateFieldTypeSpy.mockRestore();
    validateAttributeTypesSpy.mockRestore();
  });
});
