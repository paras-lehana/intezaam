/**
 * Message templates for the offline drafts (synthesis §5 job 4 fallback): six kinds in
 * English, Hindi and Hinglish, including the owner's Hinglish RSVP reminder (bio-bandish
 * guest manager, 01 §3.8).
 *
 * Responsibility: one function per kind and register that fills a message from the draft
 * facts only — event kind, date, city, guest count, functions, the vendor's questions, the
 * budget (plan summary only) and the host's name — in a warm or formal tone.
 * Boundary: text only; Hinglish is in draft-templates-hinglish.ts, and the choice of register
 * and the facts-used list are in drafts.ts.
 */
import type { DraftFacts, DraftKind, DraftTone } from '../genai/draft-facts.js';

export const DRAFT_REGISTERS = ['en', 'hi', 'hinglish'] as const;

export type DraftRegister = (typeof DRAFT_REGISTERS)[number];

export interface DraftText {
  readonly subject?: string;
  readonly body: string;
}

export type Template = (facts: DraftFacts, tone: DraftTone) => DraftText;

const GREETING: Readonly<Record<DraftRegister, Record<DraftTone, string>>> = {
  en: { warm: 'Namaste,', formal: 'Dear Sir or Madam,' },
  hi: { warm: 'नमस्ते,', formal: 'आदरणीय महोदय/महोदया,' },
  hinglish: { warm: 'Namaste ji 🙏', formal: 'Aadarniya mahoday/mahodaya,' },
};

const SIGN_OFF: Readonly<Record<DraftRegister, Record<DraftTone, string>>> = {
  en: { warm: 'Warm regards,', formal: 'Yours sincerely,' },
  hi: { warm: 'सप्रेम,', formal: 'सादर,' },
  hinglish: { warm: 'Dhanyavaad 🙏', formal: 'Saadar,' },
};

/**
 * Wraps message lines in the register's greeting and sign-off, signed with the host's name.
 * @example
 * frame('en', 'warm', facts, ['See you there.']).startsWith('Namaste,\n\nSee you there.'); // true
 */
export function frame(
  register: DraftRegister,
  tone: DraftTone,
  facts: DraftFacts,
  lines: readonly string[],
): string {
  const host = facts.hostName === undefined ? [] : [facts.hostName];
  return [GREETING[register][tone], '', ...lines, '', SIGN_OFF[register][tone], ...host].join('\n');
}

/**
 * The date phrase: `on` + the date when it is fixed, `open` while it is not.
 * @example
 * when({ ...facts, date: '25 Nov 2026' }, ' on', ''); // ' on 25 Nov 2026'
 */
export function when(facts: DraftFacts, on: string, open: string): string {
  return facts.date === undefined ? open : `${on} ${facts.date}`;
}

/**
 * Items as "- item" lines (none when the list is absent).
 * @example
 * bullets(['Is GST included?']); // ['- Is GST included?']
 */
export function bullets(items: readonly string[] | undefined): string[] {
  return (items ?? []).map((item) => `- ${item}`);
}

/**
 * The functions in brackets after the occasion, or nothing when there are none.
 * @example
 * functionList({ ...facts, functions: ['Haldi', 'Wedding'] }); // ' (Haldi, Wedding)'
 */
export function functionList(facts: DraftFacts): string {
  return facts.functions.length === 0 ? '' : ` (${facts.functions.join(', ')})`;
}

/**
 * The date in brackets after the occasion, or nothing while it is not fixed.
 * @example
 * bracketDate({ ...facts, date: '25 Nov 2026' }); // ' (25 Nov 2026)'
 */
export function bracketDate(facts: DraftFacts): string {
  return facts.date === undefined ? '' : ` (${facts.date})`;
}

/** Hindi puts the date before "को" ("25 Nov 2026 को"); `open` stands in while it is not fixed. */
function hiDate(facts: DraftFacts, open: string): string {
  return facts.date === undefined ? open : ` ${facts.date} को`;
}

export const EN_TEMPLATES: Readonly<Record<DraftKind, Template>> = {
  'vendor-enquiry': (f, tone) => ({
    subject: `Enquiry: ${f.vendorCategory ?? 'services'} for a ${f.eventKind.toLowerCase()} in ${f.city}`,
    body: frame('en', tone, f, [
      `We are planning a ${f.eventKind.toLowerCase()} in ${f.city}${when(f, ' on', ' (date to be fixed)')} for ${f.guestBand}${functionList(f)}. Are you available?`,
      ...(f.questions === undefined
        ? []
        : ['', 'Could you please tell us:', ...bullets(f.questions)]),
      '',
      'Please send a written quote with GST shown separately.',
    ]),
  }),
  invitation: (f, tone) => ({
    body: frame('en', tone, f, [
      `With joy, we invite you and your family to our ${f.eventKind.toLowerCase()} in ${f.city}${when(f, ' on', '')}${functionList(f)}. Your presence and blessings would mean a lot to us.`,
    ]),
  }),
  'rsvp-reminder': (f, tone) => ({
    body: frame('en', tone, f, [
      `A gentle reminder about our ${f.eventKind.toLowerCase()} in ${f.city}${when(f, ' on', '')}. Could you let us know whether you can join, so we can plan the arrangements?`,
      '',
      'Reply: Yes / No / Will confirm soon',
    ]),
  }),
  'volunteer-brief': (f, tone) => ({
    body: frame('en', tone, f, [
      `We are organising a ${f.eventKind.toLowerCase()} in ${f.city}${when(f, ' on', '')} for ${f.guestBand}. We need volunteers for welcome, food, crowd guidance and clean-up.`,
      'Please reply with the role you would like and the hours you can give.',
    ]),
  }),
  'thank-you': (f, tone) => ({
    body: frame('en', tone, f, [
      `Thank you for being part of our ${f.eventKind.toLowerCase()} in ${f.city}. Your presence made the day special for our family.`,
    ]),
  }),
  'plan-summary': (f) => ({
    subject: `Plan: ${f.eventKind} in ${f.city}`,
    body: [
      `${f.eventKind} in ${f.city}${when(f, ',', ', date not fixed yet')}`,
      `Guests: ${f.guestBand}`,
      ...(f.budgetBand === undefined ? [] : [`Budget: ${f.budgetBand}`]),
      ...(f.functions.length === 0 ? [] : [`Functions: ${f.functions.join(', ')}`]),
      '',
      'Made with Intezaam. These are estimates: get three written quotes before you book.',
    ].join('\n'),
  }),
};

export const HI_TEMPLATES: Readonly<Record<DraftKind, Template>> = {
  'vendor-enquiry': (f, tone) => ({
    subject: `पूछताछ: ${f.city} में ${f.eventKind}`,
    body: frame('hi', tone, f, [
      `हम ${f.city} में${hiDate(f, ' (तारीख़ तय होनी है)')} ${f.guestBand} के लिए ${f.eventKind} की योजना बना रहे हैं${functionList(f)}। क्या आप उपलब्ध हैं?`,
      ...(f.questions === undefined ? [] : ['', 'कृपया बताएँ:', ...bullets(f.questions)]),
      '',
      'कृपया GST अलग दिखाते हुए लिखित कोटेशन भेजें।',
    ]),
  }),
  invitation: (f, tone) => ({
    body: frame('hi', tone, f, [
      `हमें आपको और आपके परिवार को ${f.city} में${hiDate(f, '')} हमारे ${f.eventKind} में आमंत्रित करते हुए बहुत खुशी हो रही है${functionList(f)}। आपकी उपस्थिति और आशीर्वाद हमारे लिए बहुत मायने रखते हैं।`,
    ]),
  }),
  'rsvp-reminder': (f, tone) => ({
    body: frame('hi', tone, f, [
      `${f.city} में${hiDate(f, '')} हमारे ${f.eventKind} की याद दिला रहे हैं। कृपया बताएँ कि आप आ पाएँगे या नहीं, ताकि हम व्यवस्था कर सकें।`,
      '',
      'जवाब: हाँ / नहीं / जल्द बताएँगे',
    ]),
  }),
  'volunteer-brief': (f, tone) => ({
    body: frame('hi', tone, f, [
      `${f.city} में${hiDate(f, '')} ${f.guestBand} के लिए ${f.eventKind} का आयोजन हो रहा है। स्वागत, भोजन, भीड़ प्रबंधन और सफ़ाई के लिए स्वयंसेवक चाहिए।`,
      'कृपया अपनी पसंद की भूमिका और समय बताएँ।',
    ]),
  }),
  'thank-you': (f, tone) => ({
    body: frame('hi', tone, f, [
      `${f.city} में हमारे ${f.eventKind} में शामिल होने के लिए धन्यवाद। आपकी उपस्थिति ने इस दिन को ख़ास बना दिया।`,
    ]),
  }),
  'plan-summary': (f) => ({
    subject: `योजना: ${f.city} में ${f.eventKind}`,
    body: [
      `${f.city} में ${f.eventKind}${when(f, ',', ', तारीख़ तय नहीं')}`,
      `मेहमान: ${f.guestBand}`,
      ...(f.budgetBand === undefined ? [] : [`बजट: ${f.budgetBand}`]),
      ...(f.functions.length === 0 ? [] : [`कार्यक्रम: ${f.functions.join(', ')}`]),
      '',
      'Intezaam से बनाया गया। ये अनुमान हैं: बुक करने से पहले तीन लिखित कोटेशन लें।',
    ].join('\n'),
  }),
};
