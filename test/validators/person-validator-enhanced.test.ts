import { describe, beforeEach, it, expect, vi } from 'vitest';
import { PersonValidator } from '../../src/objects/people-write.js';
import { searchCompanies } from '../../src/objects/companies/search.js';

// Mock companies search
vi.mock('../../src/objects/companies/search.js', () => ({
  searchCompanies: vi.fn(),
}));

// Mock the new email validation module
vi.mock('../../src/objects/people/email-validation.js', () => ({
  searchPeopleByEmails: vi.fn(async (emails: string[]) => {
    return emails.map((email) => ({
      email,
      exists: email === 'dup@example.com',
      personId: email === 'dup@example.com' ? 'existing-person-id' : undefined,
    }));
  }),
}));

describe('PersonValidator.validateCreate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should reject duplicate email addresses', async () => {
    // This test uses the local mock which returns exists: true for dup@example.com
    const attrs = { name: 'Test', email_addresses: ['dup@example.com'] } as any;
    await expect(PersonValidator.validateCreate(attrs)).rejects.toThrow(
      'Person(s) with email(s) dup@example.com already exist'
    );
  });

  it('should resolve company name to record id', async () => {
    // This test uses the global mock which returns exists: false for emails other than dup@example.com
    (searchCompanies as vi.Mock).mockResolvedValue([
      { id: { record_id: 'comp_1' } },
    ]);
    const attrs = {
      name: 'Test',
      company: 'Acme',
      email_addresses: ['a@b.com'],
    } as any;
    const result = await PersonValidator.validateCreate(attrs);
    expect(result.company).toEqual({ record_id: 'comp_1' });
  });

  it('should throw error when company name not found', async () => {
    (searchCompanies as vi.Mock).mockResolvedValue([]);
    const attrs = {
      name: 'Test',
      company: 'None',
      email_addresses: ['a@b.com'],
    } as any;
    await expect(PersonValidator.validateCreate(attrs)).rejects.toThrow(
      "Company 'None' not found. Provide a valid company ID."
    );
  });
});
