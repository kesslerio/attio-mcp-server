/**
 * Simple test for email validation function to verify it works correctly
 */

import { describe, it, expect } from 'vitest';
import { isValidEmail } from '../../../../src/utils/validation/email-validation.js';

describe('Email Validation Function', () => {
  describe('Invalid Email Rejection', () => {
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
      'user@ex ample.com'
    ];

    for (const invalidEmail of invalidEmails) {
      it(`should reject invalid email "${invalidEmail}"`, () => {
        expect(isValidEmail(invalidEmail)).toBe(false);
      });
    }
  });

  describe('Valid Email Acceptance', () => {
    const validEmails = [
      'user@example.com',
      'user.name@example.com',
      'user+tag@example.com',
      'user123@example.com',
      'user_name@example.com',
      'user-name@example.com',
      'user@subdomain.example.com',
      'user@example.co.uk',
      'User@Example.Com'
    ];

    for (const validEmail of validEmails) {
      it(`should accept valid email "${validEmail}"`, () => {
        expect(isValidEmail(validEmail)).toBe(true);
      });
    }
  });
});