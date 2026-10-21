/**
 * Ceremony sequences by tradition (FN-01, VEN-01) — the rites inside the functions.
 *
 * Responsibility: for each tradition, its rites in order with the day offset from the
 * main day, the function card that shows them and the vendors they need (04 §4.1–4.8).
 * Steps marked as assumed come from common practice rather than the cited page (grade D);
 * the rest take the tradition's grade. Boundary: indicative; families vary.
 */
import type { FunctionKind } from './functions.js';
import type { Tradition } from './traditions.js';
import type { VendorType } from './vendors.js';

export interface CeremonyStep {
  readonly key: string;
  readonly name: string;
  readonly dayOffset: number;
  /** The function card that shows this rite; null for home rites outside planned functions. */
  readonly functionKind: FunctionKind | null;
  readonly vendors: readonly VendorType[];
  /** True when the step comes from common practice, not the cited source (grade D). */
  readonly assumed: boolean;
}

function step(
  key: string,
  name: string,
  dayOffset: number,
  functionKind: FunctionKind | null,
  vendors: readonly VendorType[],
): CeremonyStep {
  return { key, name, dayOffset, functionKind, vendors, assumed: false };
}

function assumedStep(...args: Parameters<typeof step>): CeremonyStep {
  return { ...step(...args), assumed: true };
}

export const CEREMONY_SEQUENCES: Readonly<Record<Tradition, readonly CeremonyStep[]>> = {
  'north-hindu': [
    step('roka', 'Roka', -90, 'roka', ['venue', 'caterer']),
    step('sangeet', 'Sangeet', -2, 'sangeet', ['venue', 'dj_band', 'choreographer', 'caterer']),
    step('mehendi', 'Mehendi', -1, 'mehendi', ['mehendi', 'decorator', 'caterer']),
    step('haldi', 'Haldi', -1, 'haldi', ['decorator', 'florist']),
    step('baraat', 'Baraat', 0, 'wedding', ['band_baaja', 'dhol', 'sound_light']),
    step('milni', 'Milni', 0, 'wedding', []),
    step('jaimala', 'Jaimala or Varmala', 0, 'wedding', ['florist', 'decorator']),
    step('kanyadaan', 'Kanyadaan', 0, 'wedding', ['pandit']),
    step('vivaha-homa', 'Vivaha homa', 0, 'wedding', ['pandit', 'decorator']),
    step('saptapadi', 'Saptapadi (pheras)', 0, 'wedding', ['pandit']),
    step('sindoor-mangalsutra', 'Sindoor and mangalsutra', 0, 'wedding', ['jeweller']),
    step('vidaai', 'Vidaai', 0, 'wedding', ['transport']),
    step('griha-pravesh', 'Griha Pravesh', 1, null, ['pandit']),
    assumedStep('reception', 'Reception', 1, 'reception', ['venue', 'caterer', 'dj_band']),
  ],
  tamil: [
    step('nichayathartham', 'Nichayathartham', -30, 'engagement', ['pandit', 'caterer']),
    step('ganapathy-puja', 'Ganapathy puja and Nandi sraadham', 0, 'wedding', ['pandit']),
    step('kashi-yatra', 'Kashi Yatra', 0, 'wedding', []),
    step('oonjal', 'Maalai maatral and Oonjal', 0, 'wedding', ['decorator', 'nadaswaram']),
    step('kanyadanam', 'Kanyadanam', 0, 'wedding', ['pandit']),
    step('mangalya-dharanam', 'Mangalya dharanam', 0, 'wedding', ['pandit', 'jeweller']),
    step('saptapadi', 'Saptapadi and Vivaha homa', 0, 'wedding', ['pandit']),
  ],
  telugu: [
    step('nischitartham', 'Nischitartham', -30, 'engagement', ['pandit']),
    step('pellikuthuru', 'Pellikuthuru and Pellikoduku', -1, 'haldi', []),
    step('snathakam', 'Snathakam, Kasi Yatra and Edurukolu', 0, 'wedding', ['nadaswaram']),
    step('jeelakarra-bellam', 'Kanyadanam and Jeelakarra Bellam', 0, 'wedding', ['pandit']),
    step('talambralu', 'Mangalya Dharana and Talambralu', 0, 'wedding', ['pandit', 'photographer']),
    step('satyanarayana-vratam', 'Satyanarayana Vratam', 1, null, ['pandit']),
  ],
  bengali: [
    step('aiburobhaat', 'Aiburobhaat', -2, null, ['caterer']),
    step('gaye-holud', 'Gaye Holud', 0, 'haldi', []),
    step('mala-badal', 'Mala Badal and Shubho Drishti', 0, 'wedding', ['florist']),
    step('saat-paake', 'Saat Paake', 0, 'wedding', []),
    step('saptapadi', 'Saptapadi and Khoi porano', 0, 'wedding', ['pandit']),
    step('sindoor-daan', 'Sindoor Daan', 0, 'wedding', []),
    step('bou-boron', 'Bou Boron', 1, null, []),
    step('bou-bhat', 'Bou Bhat', 2, 'reception', ['venue', 'caterer', 'decorator', 'photographer']),
  ],
  marathi: [
    step('sakhar-puda', 'Sakhar Puda', -30, 'engagement', ['caterer']),
    step('kelvan', 'Kelvan', -2, null, ['pandit', 'caterer']),
    step('halad-chadavane', 'Halad Chadavane', -1, 'haldi', []),
    step('seemant-pujan', 'Seemant Pujan', 0, 'wedding', ['pandit']),
    step('antarpat', 'Antarpat and Mangalashtak', 0, 'wedding', ['pandit']),
    step('kanyadaan', 'Kanyadaan, mangalsutra and sindoor', 0, 'wedding', ['pandit', 'jeweller']),
    step('saptapadi', 'Saptapadi', 0, 'wedding', ['pandit']),
  ],
  gujarati: [
    step('chandlo-matli', 'Chandlo Matli (date fixed)', -90, null, ['pandit']),
    step('gol-dhana', 'Gol Dhana', -60, 'engagement', ['caterer']),
    step('mandap-mahurat', 'Mandap Mahurat and Griha Shanti', -2, null, ['pandit', 'tent_house']),
    step('pithi', 'Pithi', -1, 'haldi', []),
    step('mehndi-garba', 'Mehndi and Garba night', -1, 'sangeet', ['mehendi', 'dj_band', 'dhol']),
    step('jaan-ponkhana', 'Jaan and Ponkhana', 0, 'wedding', ['band_baaja', 'dhol']),
    step('hast-milap', 'Jaimala, Kanyadaan and Hasta Milap', 0, 'wedding', ['pandit', 'florist']),
    step('mangal-fera', 'Mangal Fera and Saptapadi', 0, 'wedding', ['pandit']),
  ],
  'punjabi-sikh': [
    step('roka-chunni', 'Roka and Chunni chadana', -90, 'roka', ['caterer']),
    step('sangeet-mehendi', 'Sangeet and Mehendi', -2, 'sangeet', ['dj_band', 'dhol', 'mehendi']),
    step('maiyan-jaggo', 'Maiyan, Vatna and Jaggo', -1, 'haldi', ['dhol']),
    step('chooda', 'Chooda', 0, null, ['jeweller']),
    step('sehrabandi', 'Sehrabandi and Ghodi chadna', 0, 'wedding', ['band_baaja']),
    step('milni', 'Milni', 0, 'wedding', []),
    step('laavan', 'Anand Karaj: the four Laavan', 0, 'wedding', ['granthi']),
    step('doli', 'Doli and Pani Bharna', 0, 'wedding', ['transport']),
  ],
  muslim: [
    assumedStep('mehndi-manjha', 'Mehndi or Manjha', -1, 'mehendi', ['mehendi', 'caterer']),
    step('nikah', 'Nikah', 0, 'wedding', ['qazi', 'venue', 'caterer']),
    step('rukhsati', 'Rukhsati', 0, 'wedding', ['transport']),
    step('walima', 'Walima', 1, 'reception', ['venue', 'caterer', 'decorator', 'photographer']),
  ],
  christian: [
    step('banns', 'Banns or notice in the parish', -21, null, ['church_minister']),
    step('church-ceremony', 'Church wedding', 0, 'wedding', [
      'church_minister',
      'florist',
      'photographer',
    ]),
    assumedStep('reception', 'Reception', 0, 'reception', ['venue', 'caterer', 'cake', 'dj_band']),
  ],
  'civil-other': [],
};
