import { searchCompanies } from '../../src/objects/companies/search.js';
import {
  PersonValidator,
  searchPeopleByEmails,
} from '../../src/objects/people-write.js';

// Mock the API client to avoid initialization issues
vi.mock('../../src/api/attio-client.js');

// Mock people search functions
vi.mock('../../src/objects/people-write.js', async () => {
  const actual = await vi.importActual('../../src/objects/people-write.js');
  return {
    ...actual,
    searchPeopleByEmails: vi.fn(),
  };
});

// Mock companies search
vi.mock('../../src/objects/companies/search.js', () => ({
  searchCompanies: vi.fn(),
}));

describe('PersonValidator.validateCreate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should reject duplicate email addresses', async () => {
    (searchPeopleByEmails as vi.Mock).mockResolvedValue([
      { email: 'dup@example.com', exists: true, personId: 'p1' },
    ]);
    const attrs = { name: 'Test', email_addresses: ['dup@example.com'] } as any;
    await expect(PersonValidator.validateCreate(attrs)).rejects.toThrow(
      'Person(s) with email(s) dup@example.com already exist'
    );
  });

  it('should resolve company name to record id', async () => {
    (searchPeopleByEmails as vi.Mock).mockResolvedValue([
      { email: 'a@b.com', exists: false },
    ]);
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
    (searchPeopleByEmails as vi.Mock).mockResolvedValue([
      { email: 'a@b.com', exists: false },
    ]);
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
