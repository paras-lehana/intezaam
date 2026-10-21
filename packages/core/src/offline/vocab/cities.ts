/**
 * Extra city spellings for the offline brief reader.
 *
 * Responsibility: Devanagari and colloquial spellings ("बेंगलुरु", "Blr", "Dilli") mapped to
 * the gazetteer id, plus the words that mark an origin city ("family Jaipur se aa rahi hai":
 * the venue city wins, battery B17).
 * Boundary: data only; the gazetteer itself (names, aliases, tiers) is domain/city-table.ts.
 */
import { phrases, type PhraseGroups } from './word-list.js';

/** Gazetteer id → extra spellings (Devanagari spellings are ours, grade D). */
export const CITY_EXTRA_SPELLINGS: PhraseGroups<string> = [
  ['bengaluru', 'blr | बेंगलुरु | बंगलौर | बेंगलूरु | bangaluru'],
  ['mumbai', 'मुंबई | बंबई'],
  ['delhi', 'dilli | दिल्ली | नई दिल्ली'],
  ['gurugram', 'गुरुग्राम | गुड़गांव'],
  ['noida', 'नोएडा'],
  ['kolkata', 'कोलकाता | कलकत्ता'],
  ['chennai', 'चेन्नई'],
  ['pune', 'पुणे'],
  ['jaipur', 'जयपुर'],
  ['lucknow', 'लखनऊ'],
  ['hyderabad', 'हैदराबाद'],
  ['ahmedabad', 'अहमदाबाद'],
  ['varanasi', 'वाराणसी | बनारस'],
  ['indore', 'इंदौर'],
  ['udaipur', 'उदयपुर'],
  ['patna', 'पटना'],
  ['bhopal', 'भोपाल'],
  ['kanpur', 'कानपुर'],
  ['agra', 'आगरा'],
  ['chandigarh', 'चंडीगढ़'],
  ['amritsar', 'अमृतसर'],
  ['ludhiana', 'लुधियाना'],
  ['nagpur', 'नागपुर'],
  ['surat', 'सूरत'],
  ['vadodara', 'वडोदरा'],
];

/** A city right before "se" or right after "from" is where people come from, not the venue (B17). */
export const ORIGIN_AFTER_WORDS = phrases('se | से');
export const ORIGIN_BEFORE_WORDS = phrases('from');
