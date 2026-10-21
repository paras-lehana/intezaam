/**
 * Input and output limits shared by the web form, the API validators, the prompts and
 * the plan schema.
 *
 * Responsibility: every size bound in one place, each with the reason for its value.
 * Boundary: schemas import these; nothing else hard-codes a limit.
 */

/** At least one guest; a plan for nobody has nothing to compute. */
export const MIN_GUESTS = 1;

/** 5,000 guests: the largest Indian weddings rarely exceed a few thousand, and beyond that
 * per-plate planning needs an events firm, not a family planner. */
export const MAX_GUESTS = 5_000;

/** Community footfall can far exceed a guest list; 2 lakh covers a big city pandal. */
export const MAX_FOOTFALL = 200_000;

/** ₹50 crore: well above the ₹1 crore+ top band of surveyed weddings; rejects typos. */
export const MAX_BUDGET_INR = 500_000_000;

/** ₹100 crore: the guard for any computed amount (the owner's planner used the same cap). */
export const MAX_AMOUNT_INR = 1_000_000_000;

/** A brief is a paragraph; 1,000 characters also bounds prompt-injection payloads (GenAI job 1). */
export const MAX_BRIEF_CHARS = 1_000;

/** "shaadi" alone is a usable brief; anything shorter is noise. */
export const MIN_BRIEF_CHARS = 3;

/** A question is a sentence or two; 500 characters bounds injection payloads (GenAI job 5). */
export const MAX_QUESTION_CHARS = 500;
export const MIN_QUESTION_CHARS = 2;

/** Earlier turns replayed to the model: enough for follow-ups, bounded for cost (job 5). */
export const MAX_HISTORY_TURNS = 4;

/** About 120 words, with room for Indic scripts, which take more characters per word. */
export const MAX_ANSWER_CHARS = 1_200;

/** Eight functions cover the longest wedding sequences in domain/ceremonies.ts. */
export const MAX_FUNCTIONS = 8;

/** Top three priorities (BUD-05); more would dilute the shift to nothing. */
export const MAX_PRIORITIES = 3;

/** Five style chips keep ideas focused (feature #3). */
export const MAX_STYLE_TAGS = 5;

export const MAX_CITY_CHARS = 60;
export const MAX_TITLE_CHARS = 80;

/** The largest housing societies have a few thousand flats. */
export const MAX_HOUSEHOLDS = 5_000;

/** Ganeshotsav, the longest common community programme, runs 10–11 days. */
export const MAX_EVENT_DAYS = 11;

/** About three years ahead: further out, lead times and prices are not meaningful. */
export const MAX_DAYS_AHEAD = 1_100;

/** A past date (up to a year) still gets the wrap-up tasks; older dates are rejected. */
export const MAX_DAYS_PAST = 366;

/** About 11 acres; larger grounds are outside a family or society event. */
export const MAX_AREA_SQFT = 500_000;

export const MAX_AGE_YEARS = 120;

/** Volunteers on a roster; the NDMA ratio for 2 lakh people stays below this. */
export const MAX_VOLUNTEERS = 5_000;

/** GenAI job 3 compares up to three quotes, each about two pages of pasted text. */
export const MIN_QUOTES = 1;
export const MAX_QUOTES = 3;
export const MAX_QUOTE_CHARS = 4_000;

/** About two phone screens; keeps wa.me and Gmail links well under URL limits (job 4). */
export const MAX_DRAFT_BODY_CHARS = 900;
export const MAX_SUBJECT_CHARS = 120;
export const MAX_HOST_NAME_CHARS = 60;

/** GenAI job 2: a headline under 90 characters and a summary of about 80 words. */
export const MAX_HEADLINE_CHARS = 90;
export const MAX_SUMMARY_CHARS = 700;

/** GenAI job 2 returns 6–12 ideas, each described in about 40 words. */
export const MIN_IDEAS = 6;
export const MAX_IDEAS = 12;
export const MAX_IDEA_DESCRIPTION_CHARS = 320;
export const MAX_YOUTUBE_QUERY_CHARS = 60;

/** A natural-language change rarely needs more than a few edits (job 5 patch ops). */
export const MAX_PATCH_OPS = 6;

/** Opaque ids (trace ids, task ids, quote ids) are short tokens. */
export const MAX_ID_CHARS = 64;

/** Any single line of plan text: a reason, a question, a fix. */
export const MAX_LINE_CHARS = 600;

/** A full wedding plan emits roughly a hundred trace items; 300 leaves headroom. */
export const MAX_TRACE_ITEMS = 300;

/** The longest family checklist has about 40 templates; 120 leaves headroom. */
export const MAX_TASKS = 120;

/** 34 vendor types exist; a plan lists each at most once. */
export const MAX_VENDORS = 40;
export const MAX_RISKS = 40;

/** The source register holds under 100 entries. */
export const MAX_SOURCES = 120;

/** Cash-flow months: three years ahead plus the month after the event. */
export const MAX_CASHFLOW_MONTHS = 40;

export const MAX_MODEL_ID_CHARS = 80;

/** Item titles (a task, a risk, a lever) fit on one line of a phone screen. */
export const MAX_LABEL_CHARS = 140;

/** A plan item cites at most this many trace items; more would bury the reason. */
export const MAX_TRACE_REFS = 40;

/** Context signals shown per trace item ("guests = 300", "city = Jaipur"…). */
export const MAX_TRACE_INPUTS = 12;

/** Sources cited per trace item; rules cite one to five. */
export const MAX_TRACE_SOURCES = 8;

/** GST 2.0 has 5% and 18% slabs plus a 40% demerit rate; no event bill line exceeds 40%. */
export const MAX_GST_PCT = 40;
