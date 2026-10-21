/**
 * Google services catalog contract (README.md, "Google services").
 *
 * Responsibility: the shape of one honest catalog entry — exact service name, status
 * (`implemented` or `declined`, the only two words used anywhere), purpose, code paths and
 * the NAMES of any environment variables — served at GET /api/google/services and shown
 * on the About page. Boundary: shape only; never carries secret values.
 */
import { z } from 'zod';

export const GOOGLE_SERVICE_STATUSES = ['implemented', 'declined'] as const;

export type GoogleServiceStatus = (typeof GOOGLE_SERVICE_STATUSES)[number];

const MAX_SERVICE_ID_CHARS = 64;
const MAX_SERVICE_NAME_CHARS = 80;
const MAX_PURPOSE_CHARS = 300;
const MAX_CODE_PATH_CHARS = 160;
const MAX_CODE_PATHS = 8;
const MAX_ENV_VARS = 8;
/** The catalog lists about ten implemented and a handful of declined services. */
const MAX_SERVICES = 24;

export const googleServiceEntrySchema = z.strictObject({
  id: z.string().min(1).max(MAX_SERVICE_ID_CHARS),
  name: z.string().min(1).max(MAX_SERVICE_NAME_CHARS),
  status: z.enum(GOOGLE_SERVICE_STATUSES),
  purpose: z.string().min(1).max(MAX_PURPOSE_CHARS),
  codePaths: z.array(z.string().min(1).max(MAX_CODE_PATH_CHARS)).max(MAX_CODE_PATHS),
  /** Variable NAMES only (UPPER_SNAKE); the catalog never carries values. */
  envVars: z.array(z.string().regex(/^[A-Z][A-Z0-9_]*$/)).max(MAX_ENV_VARS),
});

export type GoogleServiceEntry = z.infer<typeof googleServiceEntrySchema>;

export const googleServicesResponseSchema = z.strictObject({
  services: z.array(googleServiceEntrySchema).max(MAX_SERVICES),
});

export type GoogleServicesResponse = z.infer<typeof googleServicesResponseSchema>;
