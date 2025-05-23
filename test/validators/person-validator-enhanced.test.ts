import { PersonValidator } from '../../src/objects/people-write.js';
import { searchPeopleByEmail } from '../../src/objects/people/search.js';
import { searchCompaniesByName } from '../../src/objects/companies/search.js';

vi.mock('../../src/objects/people/search.js', () => ({
  searchPeopleByEmail: vi.fn(),
}));

vi.mock('../../src/objects/companies/search.js', () => ({
  searchCompaniesByName: vi.fn(),
}));

describe('PersonValidator.validateCreate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should reject duplicate email addresses', async () => {
    (searchPeopleByEmail as vi.Mock).mockResolvedValue([
      { id: { record_id: 'p1' } },
    ]);
    const attrs = { name: 'Test', email_addresses: ['dup@example.com'] } as any;
    await expect(PersonValidator.validateCreate(attrs)).rejects.toThrow(
      'Person with email dup@example.com already exists'
    );
  });

  it('should resolve company name to record id', async () => {
    (searchPeopleByEmail as vi.Mock).mockResolvedValue([]);
    (searchCompaniesByName as vi.Mock).mockResolvedValue([
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
    (searchPeopleByEmail as vi.Mock).mockResolvedValue([]);
    (searchCompaniesByName as vi.Mock).mockResolvedValue([]);
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
