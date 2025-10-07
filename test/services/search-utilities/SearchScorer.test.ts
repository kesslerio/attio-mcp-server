import { describe, expect, it } from 'vitest';

import { scoreAndRank } from '@/services/search-utilities/SearchScorer.js';
describe('SearchScorer', () => {
  it('ranks exact domain matches highest', () => {
    const query = 'olivebranchclinic.org';
    const results = [
      {
        id: { record_id: '1' },
        values: {
          name: 'Springfield Clinic',
          domains: ['springfieldclinic.com'],
        },
      },
      {
        id: { record_id: '2' },
        values: {
          name: 'Olive Branch Clinic',
          domains: ['olivebranchclinic.org'],
        },
      },
    ];

    const ranked = scoreAndRank(query, results);

    expect(ranked[0].values.domains).toEqual(['olivebranchclinic.org']);
  });

  it('ranks exact name matches over partial token matches', () => {
    const query = 'Teara Young';
    const results = [
      { id: { record_id: '1' }, values: { name: 'Connor Young' } },
      { id: { record_id: '2' }, values: { name: 'Teara Young' } },
      { id: { record_id: '3' }, values: { name: 'Francine Young' } },
    ];

    const ranked = scoreAndRank(query, results);

    expect(ranked[0].values.name).toBe('Teara Young');
  });
});
