import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PersonValidator } from '../../src/objects/people-write.js';
import { InvalidPersonDataError } from '../../src/objects/people-write.js';

describe('Email Validation', () => {
  describe('PersonValidator.validateCreate', () => {
    // Mock the searchPeopleByEmails function to avoid API calls
    beforeEach(() => {
      vi.mock('../../src/objects/people-write.js', async (importOriginal) => {
        const actual = await importOriginal();
        return {
          ...actual,
          searchPeopleByEmails: vi.fn().mockResolvedValue([]),
        };
      });
    });

    afterEach(() => {
      vi.clearAllMocks();
    });

    it('should reject invalid email formats during creation', async () => {
      const invalidEmails = [
        'notanemail',
        '@example.com',
        'user@',
        'user@.com',
        'user@example',
        'user @example.com',
        'user@example .com',
        'user@@example.com',
        'user.example.com',
        '',
        ' ',
        'user@ex ample.com',
        'user@exam ple.com',
        'user@example,com',
      ];

      for (const email of invalidEmails) {
        await expect(
          PersonValidator.validateCreate({
            name: 'Test User',
            email_addresses: [email],
          })
        ).rejects.toThrow(InvalidPersonDataError);
      }
    });

    it('should accept valid email formats during creation', async () => {
      const validEmails = [
        'user@example.com',
        'user.name@example.com',
        'user+tag@example.com',
        'user123@example.com',
        'user_name@example.com',
        'user-name@example.com',
        'user@subdomain.example.com',
        'user@example.co.uk',
        'user@123.456.789.012',
        'user@example-domain.com',
        'user@EXAMPLE.COM',
        'User@Example.Com',
      ];

      // Mock searchPeopleByEmails to return no duplicates
      const { searchPeopleByEmails } = await import(
        '../../src/objects/people-write.js'
      );
      vi.mocked(searchPeopleByEmails).mockResolvedValue(
        validEmails.map((email) => ({ email, exists: false }))
      );

      for (const email of validEmails) {
        const result = await PersonValidator.validateCreate({
          name: 'Test User',
          email_addresses: [email],
        });
        expect(result.email_addresses).toContain(email);
      }
    });

    it('should validate email format before checking for duplicates', async () => {
      // This test ensures validation order: format check should come before duplicate check
      const invalidEmail = 'notanemail';

      await expect(
        PersonValidator.validateCreate({
          name: 'Test User',
          email_addresses: [invalidEmail],
        })
      ).rejects.toThrow('Invalid email format');
    });

    it('should handle email addresses as array properly', async () => {
      const { searchPeopleByEmails } = await import(
        '../../src/objects/people-write.js'
      );
      vi.mocked(searchPeopleByEmails).mockResolvedValue([
        { email: 'valid1@example.com', exists: false },
        { email: 'valid2@example.com', exists: false },
      ]);

      const result = await PersonValidator.validateCreate({
        name: 'Test User',
        email_addresses: ['valid1@example.com', 'valid2@example.com'],
      });

      expect(result.email_addresses).toHaveLength(2);
      expect(result.email_addresses).toContain('valid1@example.com');
      expect(result.email_addresses).toContain('valid2@example.com');
    });

    it('should convert single email string to array', async () => {
      const { searchPeopleByEmails } = await import(
        '../../src/objects/people-write.js'
      );
      vi.mocked(searchPeopleByEmails).mockResolvedValue([
        { email: 'valid@example.com', exists: false },
      ]);

      const result = await PersonValidator.validateCreate({
        name: 'Test User',
        email_addresses: 'valid@example.com' as unknown, // Testing string input
      });

      expect(Array.isArray(result.email_addresses)).toBe(true);
      expect(result.email_addresses).toHaveLength(1);
      expect(result.email_addresses![0]).toBe('valid@example.com');
    });
  });

  describe('PersonValidator.validateAttributeUpdate', () => {
    it('should reject invalid email formats during attribute update', async () => {
      const invalidEmails = [
        'notanemail',
        '@example.com',
        'user@',
        'user@.com',
        'user@example',
        'user @example.com',
      ];

      for (const email of invalidEmails) {
        await expect(
          PersonValidator.validateAttributeUpdate(
            'person_123',
            'email_addresses',
            [email]
          )
        ).rejects.toThrow(`Invalid email format: ${email}`);
      }
    });

    it('should accept valid email formats during attribute update', async () => {
      const validEmails = [
        'user@example.com',
        'user.name@example.com',
        'user+tag@example.com',
      ];

      for (const email of validEmails) {
        await expect(
          PersonValidator.validateAttributeUpdate(
            'person_123',
            'email_addresses',
            [email]
          )
        ).resolves.not.toThrow();
      }
    });
  });
});
