import { describe, it, expect } from 'vitest';
import {
  credentialPatterns,
  defaultPatterns,
  headerPatterns,
  phiPatterns,
  piiPatterns,
} from '../src/constants';
import { PatternEntry } from '../src/types';

const toMatchString = (entry: PatternEntry): string =>
  typeof entry === 'string' ? entry : entry.match;

describe('constants', () => {
  describe('credentialPatterns', () => {
    it('should be a non-empty array', () => {
      expect(credentialPatterns.length).toBeGreaterThan(0);
    });

    it('should contain common credential field names', () => {
      const matches = credentialPatterns.map(toMatchString);
      expect(matches).toContain('password');
      expect(matches).toContain('token');
      expect(matches).toContain('secret');
    });
  });

  describe('headerPatterns', () => {
    it('should be a non-empty array', () => {
      expect(headerPatterns.length).toBeGreaterThan(0);
    });

    it('should contain common HTTP authentication header names', () => {
      const matches = headerPatterns.map(toMatchString);
      expect(matches).toContain('authorization');
      expect(matches).toContain('api-key');
    });
  });

  describe('piiPatterns', () => {
    it('should be a non-empty array', () => {
      expect(piiPatterns.length).toBeGreaterThan(0);
    });

    it('should contain common PII field names', () => {
      const matches = piiPatterns.map(toMatchString);
      expect(matches).toContain('email');
      expect(matches).toContain('phone');
      expect(matches).toContain('ssn');
    });

    it('should use strict matching for ambiguous single-word terms', () => {
      const strictEntries = piiPatterns.filter(
        (entry): entry is { match: string; strict?: boolean } =>
          typeof entry === 'object' && entry.strict === true,
      );
      const strictMatches = strictEntries.map((e) => e.match);
      expect(strictMatches).toContain('address');
      expect(strictMatches).toContain('city');
      expect(strictMatches).toContain('state');
    });
  });

  describe('phiPatterns', () => {
    it('should be a non-empty array', () => {
      expect(phiPatterns.length).toBeGreaterThan(0);
    });

    it('should contain common PHI field names', () => {
      const matches = phiPatterns.map(toMatchString);
      expect(matches).toContain('patient_id');
      expect(matches).toContain('diagnosis');
      expect(matches).toContain('medication');
    });
  });

  describe('defaultPatterns', () => {
    it('should be a non-empty array', () => {
      expect(defaultPatterns.length).toBeGreaterThan(0);
    });

    it('should include all credential patterns', () => {
      const defaultMatches = defaultPatterns.map(toMatchString);
      for (const entry of credentialPatterns) {
        expect(defaultMatches).toContain(toMatchString(entry));
      }
    });

    it('should include all header patterns', () => {
      const defaultMatches = defaultPatterns.map(toMatchString);
      for (const entry of headerPatterns) {
        expect(defaultMatches).toContain(toMatchString(entry));
      }
    });

    it('should not include PII patterns', () => {
      const defaultMatches = defaultPatterns.map(toMatchString);
      const piiMatches = piiPatterns.map(toMatchString);
      for (const match of piiMatches) {
        expect(defaultMatches).not.toContain(match);
      }
    });

    it('should not include PHI patterns', () => {
      const defaultMatches = defaultPatterns.map(toMatchString);
      const phiMatches = phiPatterns.map(toMatchString);
      for (const match of phiMatches) {
        expect(defaultMatches).not.toContain(match);
      }
    });

    it('should have no duplicate match strings', () => {
      const matches = defaultPatterns.map(toMatchString);
      const unique = new Set(matches);
      expect(unique.size).toBe(matches.length);
    });
  });
});
