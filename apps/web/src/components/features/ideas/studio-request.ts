/**
 * The draft request the message studio sends.
 *
 * Responsibility: turn the studio's pickers into one `DraftRequest` — the vendor only for a
 * vendor enquiry, the host name only when typed (trimmed), and Hinglish only for an English
 * draft after a Hinglish brief. Boundary: pure; the studio owns the pickers, the server
 * validates the request again with `draftRequestSchema`.
 */
import type { LanguageCode, VendorType } from '@intezaam/core/domain';
import type { DraftRequest, EventContext } from '@intezaam/core/schemas';
import { hinglishPart } from '../common/draft-register';
import type { DraftKind, DraftTone } from './idea-labels';

export interface StudioChoice {
  readonly context: EventContext;
  readonly todayIso: string;
  readonly kind: DraftKind;
  readonly language: LanguageCode;
  readonly tone: DraftTone;
  readonly vendor: VendorType | '';
  readonly host: string;
  readonly hinglish?: boolean | undefined;
}

/**
 * The request for what the studio shows.
 * @example
 * studioRequest({ ...choice, kind: 'invitation', host: '  ' }).hostName; // undefined
 */
export function studioRequest(choice: StudioChoice): DraftRequest {
  const { context, todayIso, kind, language, tone, vendor } = choice;
  const host = choice.host.trim();
  return {
    context,
    todayIso,
    kind,
    language,
    tone,
    ...hinglishPart(language, choice.hinglish),
    ...(kind === 'vendor-enquiry' && vendor !== '' ? { vendorType: vendor } : {}),
    ...(host === '' ? {} : { hostName: host }),
  };
}
