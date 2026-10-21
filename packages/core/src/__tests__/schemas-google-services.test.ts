/**
 * Tests for schemas/google-services.ts: the honest Google services catalog contract.
 *
 * Responsibility: pin the behaviour other packages rely on. Boundary: expected values come
 * from inputs the test owns or are derived from the tables under test, never hand-computed.
 */
import { describe, expect, it } from 'vitest';
import {
  GOOGLE_SERVICE_STATUSES,
  googleServiceEntrySchema,
  googleServicesResponseSchema,
} from '../schemas/google-services.js';

const entry = {
  id: 'google-calendar-links',
  name: 'Google Calendar template links',
  status: 'implemented',
  purpose: 'Adds each task and function to Google Calendar in one tap.',
  codePaths: ['packages/core/src/integrations/google-links.ts'],
  envVars: [],
};

describe('Google services catalog', () => {
  it('uses only the words implemented and declined', () => {
    expect([...GOOGLE_SERVICE_STATUSES]).toEqual(['implemented', 'declined']);
    expect(googleServiceEntrySchema.safeParse({ ...entry, status: 'planned' }).success).toBe(false);
  });

  it('carries environment variable names, never values', () => {
    expect(
      googleServiceEntrySchema.safeParse({ ...entry, envVars: ['LLM_SERVICE_URL'] }).success,
    ).toBe(true);
    expect(googleServiceEntrySchema.safeParse({ ...entry, envVars: ['sk-live-123'] }).success).toBe(
      false,
    );
  });

  it('wraps entries in a strict response', () => {
    expect(googleServicesResponseSchema.safeParse({ services: [entry] }).success).toBe(true);
    expect(googleServicesResponseSchema.safeParse({ services: [entry], secret: 'x' }).success).toBe(
      false,
    );
  });
});
