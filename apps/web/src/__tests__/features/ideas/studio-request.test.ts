/**
 * Responsibility: studioRequest — the studio's pickers become one draft request the server
 * accepts: the vendor only for an enquiry, a trimmed host name only when typed, and Hinglish
 * only for English after a Hinglish brief. Boundary: the context comes from core's sample;
 * the picker values are the ones this test owns.
 */
import { describe, expect, it } from 'vitest';
import { draftRequestSchema } from '@intezaam/core/schemas';
import {
  type StudioChoice,
  studioRequest,
} from '../../../components/features/ideas/studio-request';
import { panelProps } from '../plan-fixtures';

const { context, todayIso } = panelProps('jaipur-wedding');
const CHOICE: StudioChoice = {
  context,
  todayIso,
  kind: 'invitation',
  language: 'en',
  tone: 'warm',
  vendor: 'caterer',
  host: '  The Sharma family  ',
};

describe('studioRequest', () => {
  it('sends a trimmed host name and leaves the vendor out of an invitation', () => {
    const request = draftRequestSchema.parse(studioRequest(CHOICE));
    expect(request.hostName).toBe('The Sharma family');
    expect(request).not.toHaveProperty('vendorType');
    expect(request).not.toHaveProperty('hinglish');
  });

  it('names the vendor for an enquiry and drops an empty host name', () => {
    const request = studioRequest({ ...CHOICE, kind: 'vendor-enquiry', host: '   ' });
    expect(request.vendorType).toBe(CHOICE.vendor);
    expect(request).not.toHaveProperty('hostName');
    expect(studioRequest({ ...CHOICE, kind: 'vendor-enquiry', vendor: '' })).not.toHaveProperty(
      'vendorType',
    );
  });

  it('asks for Hinglish only for English after a Hinglish brief', () => {
    expect(draftRequestSchema.parse(studioRequest({ ...CHOICE, hinglish: true })).hinglish).toBe(
      true,
    );
    expect(studioRequest({ ...CHOICE, language: 'hi', hinglish: true })).not.toHaveProperty(
      'hinglish',
    );
  });
});
