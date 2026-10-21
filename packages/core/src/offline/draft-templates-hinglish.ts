/**
 * Hinglish message templates for the offline drafts, for families who type Hindi in the
 * Latin script (Hinglish input gets Hinglish drafts).
 *
 * Responsibility: the six kinds in romanised Hindi, with the RSVP reminder adapted from the
 * owner's guest-manager WhatsApp template — no guest names, only the
 * draft facts. Boundary: text only.
 */
import type { DraftKind } from '../genai/draft-facts.js';
import {
  bracketDate,
  bullets,
  frame,
  functionList,
  when,
  type Template,
} from './draft-templates.js';

export const HINGLISH_TEMPLATES: Readonly<Record<DraftKind, Template>> = {
  'vendor-enquiry': (f, tone) => ({
    subject: `Enquiry: ${f.city} mein ${f.eventKind}`,
    body: frame('hinglish', tone, f, [
      `Hum ${f.city} mein ${f.guestBand} ke liye ${f.eventKind} plan kar rahe hain${when(f, ',', ' (date abhi fix nahi hai)')}${functionList(f)}. Kya aap available hain?`,
      ...(f.questions === undefined ? [] : ['', 'Kripya batayein:', ...bullets(f.questions)]),
      '',
      'Kripya GST alag dikhate hue likhit quote bhejein.',
    ]),
  }),
  invitation: (f, tone) => ({
    body: frame('hinglish', tone, f, [
      `Aapko aur aapke parivaar ko ${f.city} mein hamare ${f.eventKind}${bracketDate(f)} mein aamantrit karte hue humein bahut khushi ho rahi hai${functionList(f)}.`,
      'Aapki upasthiti aur aashirvaad hamare liye bahut maayne rakhte hain.',
    ]),
  }),
  'rsvp-reminder': (f, tone) => ({
    body: frame('hinglish', tone, f, [
      `Aap ${f.city} mein hamare ${f.eventKind}${bracketDate(f)} mein padhaar rahe hain?`,
      'Hamare parivaar ko aapka intezaar rahega.',
      '',
      '✅ Haan / ❌ Nahi / 🤔 Baad mein bata denge',
    ]),
  }),
  'volunteer-brief': (f, tone) => ({
    body: frame('hinglish', tone, f, [
      `${f.city} mein ${f.guestBand} ke liye ${f.eventKind} ho raha hai${when(f, ',', '')}. Swagat, khana, bheed sambhalne aur safai ke liye volunteers chahiye.`,
      'Kripya reply karke batayein ki aap kaun sa kaam aur kitna samay de sakte hain.',
    ]),
  }),
  'thank-you': (f, tone) => ({
    body: frame('hinglish', tone, f, [
      `${f.city} mein hamare ${f.eventKind} mein shaamil hone ke liye dil se dhanyavaad. Aapke aane se din khaas ban gaya.`,
    ]),
  }),
  'plan-summary': (f) => ({
    subject: `Plan: ${f.city} mein ${f.eventKind}`,
    body: [
      `${f.city} mein ${f.eventKind}${when(f, ',', ', date abhi fix nahi')}`,
      `Mehmaan: ${f.guestBand}`,
      ...(f.budgetBand === undefined ? [] : [`Budget: ${f.budgetBand}`]),
      ...(f.functions.length === 0 ? [] : [`Functions: ${f.functions.join(', ')}`]),
      '',
      'Intezaam se banaya gaya. Yeh andaaze hain: book karne se pehle teen likhit quote lein.',
    ].join('\n'),
  }),
};
