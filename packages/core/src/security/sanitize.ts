/**
 * Unicode sanitiser for every piece of user text before it is parsed, cached, fenced or
 * sent to a model.
 *
 * Responsibility: remove every character that is invisible or can reorder text ("Trojan
 * Source", CVE-2021-42574, and "ASCII smuggling" through the Tags block): C0 and C1 controls
 * (tab and newline survive), format characters (bidi marks, embeddings, overrides and the
 * U+2066–U+2069 isolates, zero-width characters, tags) and every default-ignorable code point
 * (variation selectors, the combining grapheme joiner, Hangul fillers); then collapse runs of
 * spaces and blank lines and cap the length by code points.
 * Boundary: pure and lossy on purpose — it never interprets the text; redaction and
 * delimiter neutralising are separate steps (privacy/redact.ts, genai/prompt-boundary.ts).
 */

/**
 * Hidden characters, chosen by Unicode property rather than a hand-kept range list, so a
 * code point the list forgot (or Unicode adds later) cannot hide an instruction from the
 * prompt guards or split a phone number past the redactor:
 * - `Cc`: C0/C1 controls; the lookahead keeps tab and newline, which the whitespace pass
 *   below handles (carriage returns were already turned into newlines);
 * - `Cf`: format characters — soft hyphen, bidi marks, embeddings, overrides and isolates,
 *   zero-width space/joiners, word joiner, byte-order mark, and the tags U+E0001–U+E007F;
 * - `Cs`: a lone surrogate half is not text at all (UTF-8 encoders turn it into U+FFFD);
 * - `Default_Ignorable_Code_Point`: what renderers draw as nothing — variation selectors
 *   U+FE00–U+FE0F and U+E0100–U+E01EF, U+034F, Hangul fillers U+115F, U+1160, U+3164 and
 *   U+FFA0, Mongolian selectors U+180B–U+180F, and the reserved ignorable ranges.
 * The ES2024 `v` flag could subtract tab and newline from the class directly, but the
 * compile target is ES2023, so a negative lookahead does it instead.
 */
const HIDDEN_CHARACTERS = /(?![\t\n])[\p{Cc}\p{Cf}\p{Cs}\p{Default_Ignorable_Code_Point}]/gu;
/** Line and paragraph separators become newlines so line-based guards still see them. */
const LINE_BREAKS = /\r\n?|[\u{2028}\u{2029}]/gu;
/** Horizontal whitespace runs (anything but a newline) collapse to one space. */
const HORIZONTAL_SPACE_RUN = /[^\S\n]+/g;
/** Spaces hugging a newline add nothing. */
const SPACE_AROUND_NEWLINE = / ?\n ?/g;
/** More than one blank line in a row is padding, not meaning. */
const BLANK_LINE_RUN = /\n{3,}/g;

/**
 * Drops hidden and reordering characters, collapses whitespace and caps the length.
 * The cap counts code points, so an emoji or an Indic conjunct is never cut in half.
 * @example
 * sanitizeUserText('shaadi\u{202E} 200 log\u{2066}', 100); // 'shaadi 200 log'
 * sanitizeUserText('98765\u{E0020}43210', 100); // '9876543210' (the redactor now sees it)
 * sanitizeUserText('a   b\n\n\n\nc', 100); // 'a b\n\nc'
 */
export function sanitizeUserText(text: string, maxChars: number): string {
  // Efficiency: a fixed chain of linear regex passes; the property class compiles once at
  // module load, so no per-character table lookup or string concatenation remains.
  const collapsed = text
    .replace(LINE_BREAKS, '\n')
    .replace(HIDDEN_CHARACTERS, '')
    .replace(HORIZONTAL_SPACE_RUN, ' ')
    .replace(SPACE_AROUND_NEWLINE, '\n')
    .replace(BLANK_LINE_RUN, '\n\n')
    .trim();
  const limit = Math.max(0, Math.floor(maxChars));
  if (collapsed.length <= limit) return collapsed;
  return Array.from(collapsed).slice(0, limit).join('').trim();
}
