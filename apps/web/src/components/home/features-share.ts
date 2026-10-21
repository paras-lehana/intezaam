/**
 * Feature tiles, part 3: Community and Share.
 *
 * Responsibility: the user-facing title, one-line description and target of each tile in
 * these two groups. Boundary: copy only; every claim describes what the app does.
 */
import { type Feature } from './feature-types';

export const SHARE_FEATURES: readonly Feature[] = [
  {
    id: 32,
    group: 'community',
    target: 'people',
    title: 'Chanda planner',
    body: 'Per-household contribution, flat or by flat size, after sponsors and the society fund — with the funding gap or surplus.',
  },
  {
    id: 33,
    group: 'community',
    target: 'people',
    title: 'Volunteer roster',
    body: 'Roles sized to your crowd (about one marshal per 100 visitors), each with an owner and a WhatsApp message.',
  },
  {
    id: 34,
    group: 'community',
    target: 'safety',
    title: 'Permissions and safety',
    body: 'Loudspeaker and pandal permission, police and fire NOCs, the 10 pm–6 am noise rule and crowd checks — each to verify with your local office.',
  },
  {
    id: 36,
    group: 'community',
    target: 'safety',
    title: 'Elders and accessibility',
    body: 'Ramps, step-free routes, seating and an accessible toilet. Ticking a need adds tasks and vendor questions.',
  },
  {
    id: 28,
    group: 'community',
    target: 'people',
    title: 'Guest list in your browser',
    body: 'Add guests or import a CSV. People are counted, not rows, and the list never leaves your browser or reaches the AI.',
  },
  {
    id: 39,
    group: 'share',
    target: 'share',
    title: 'Share and export',
    body: 'A WhatsApp summary, CSV for Google Sheets, a print view and a share link that carries your details in the link itself, not on a server.',
  },
  {
    id: 40,
    group: 'share',
    target: 'overview',
    title: 'Honest AI labels',
    body: 'Every AI answer says which Gemini model wrote it and how long it took — or that the offline planner answered instead.',
  },
  {
    id: 41,
    group: 'share',
    target: 'sources',
    title: 'Method and sources',
    body: 'Every number’s source, year and confidence grade, the Google services used and the assumptions we made.',
  },
  {
    id: 42,
    group: 'share',
    target: 'details',
    title: 'Plan in your language',
    body: 'Explanations and drafts in 11 Indian languages, from Hindi and Bengali to Tamil and Punjabi.',
  },
];
