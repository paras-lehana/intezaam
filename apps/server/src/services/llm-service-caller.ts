/**
 * llm-service adapter — the transport for every model call.
 *
 * Responsibility: translate one {@link ModelCall} into an OpenAI-style chat request for the
 * owner's LLM gateway (`POST /byok` on llm-service), which relays it to the Gemini API's
 * OpenAI-compatible endpoint on the free tier, and return the reply text. Boundary: no retries,
 * timeouts or JSON parsing here — genai-client.ts owns those; errors carry only the HTTP
 * status, never a key or body.
 */
import type { InlineFile, ModelCall, ModelCaller } from './genai-client.js';
import type { Fetch } from './http.js';

/** Low temperature: explanations and readings should be faithful, not creative. */
const TEMPERATURE = 0.2;

/**
 * llm-service rejects any message whose text is over 32,000 characters; a longer prompt is
 * split across consecutive user messages below that, which Gemini reads as one turn.
 */
export const MAX_MESSAGE_CHARS = 30_000;

/**
 * `custom` with an explicit base URL: llm-service's named providers can fall back to paid
 * models when a call fails, while `custom` fails honestly, so genai-client.ts tries the next
 * Gemini model and nothing is ever billed.
 */
const PROVIDER = 'custom';

export interface LlmServiceOptions {
  /** llm-service base URL, e.g. `http://llm-service:8095` on the shared Docker network. */
  readonly url: string;
  /** Sent only in the `X-Internal-Key` header. */
  readonly internalKey: string;
  /** OpenAI-compatible upstream that llm-service calls (the Gemini API endpoint). */
  readonly upstreamUrl: string;
  /** Upstream key, sent only in the request body llm-service expects for `/byok`. */
  readonly upstreamKey: string;
  /** Caller reference that llm-service records for usage tracking. */
  readonly ref: string;
  readonly fetch: Fetch;
}

type ContentPart =
  | { readonly type: 'text'; readonly text: string }
  | { readonly type: 'image_url'; readonly image_url: { readonly url: string } };

interface ChatMessage {
  readonly role: 'system' | 'user';
  readonly content: string | readonly ContentPart[];
}

/**
 * Splits text into pieces of at most `limit` characters, preferring to cut after a newline so
 * lines stay whole.
 * @example
 * splitText('a\nb', 2); // ['a\n', 'b']
 */
export function splitText(text: string, limit: number = MAX_MESSAGE_CHARS): [string, ...string[]] {
  if (text.length <= limit) return [text];
  const newline = text.lastIndexOf('\n', limit - 1);
  const cut = newline > 0 ? newline + 1 : limit;
  return [text.slice(0, cut), ...splitText(text.slice(cut), limit)];
}

/** PDFs and photos travel as data URLs; Gemini read both through the gateway (09 Gap 4 §4.2). */
function filePart(file: InlineFile): ContentPart {
  return {
    type: 'image_url',
    image_url: { url: `data:${file.mimeType};base64,${file.dataBase64}` },
  };
}

/**
 * Builds the chat messages: the system instruction, then the prompt in as many user messages
 * as the size limit needs, with any files at the front of the first.
 * @example
 * toChatMessages(call)[0]; // { role: 'system', content: call.system }
 */
export function toChatMessages(call: ModelCall): ChatMessage[] {
  // Efficiency: the JSON Schema already travels once in the system instruction (core
  // prompt-rules.ts); repeating it here would double the largest part of every prompt.
  const [first, ...rest] = splitText(call.prompt);
  const firstContent: string | ContentPart[] =
    call.files.length === 0 ? first : [...call.files.map(filePart), { type: 'text', text: first }];
  return [
    { role: 'system', content: call.system },
    { role: 'user', content: firstContent },
    ...rest.map((piece): ChatMessage => ({ role: 'user', content: piece })),
  ];
}

/** Reply text from an OpenAI-style completion, or `undefined` when there is none. */
function replyText(body: unknown): string | undefined {
  if (
    typeof body !== 'object' ||
    body === null ||
    !('choices' in body) ||
    !Array.isArray(body.choices)
  ) {
    return undefined;
  }
  const [choice]: unknown[] = body.choices;
  if (typeof choice !== 'object' || choice === null || !('message' in choice)) return undefined;
  const { message } = choice;
  if (typeof message !== 'object' || message === null || !('content' in message)) return undefined;
  return typeof message.content === 'string' ? message.content : undefined;
}

/**
 * Creates a {@link ModelCaller} backed by llm-service.
 * @example
 * const caller = createLlmServiceCaller({ url, internalKey, upstreamUrl, upstreamKey, ref: 'intezaam', fetch });
 */
export function createLlmServiceCaller(options: LlmServiceOptions): ModelCaller {
  const endpoint = `${options.url.replace(/\/+$/, '')}/byok`;
  return async (call) => {
    const response = await options.fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Internal-Key': options.internalKey },
      body: JSON.stringify({
        messages: toChatMessages(call),
        api_key: options.upstreamKey,
        provider: PROVIDER,
        base_url: options.upstreamUrl,
        model: call.model,
        ref: options.ref,
        temperature: TEMPERATURE,
        max_tokens: call.maxOutputTokens,
        json_mode: call.json,
      }),
      signal: call.signal,
    });
    if (!response.ok) {
      // Only the status leaves this function; genai-client.ts decides whether to fail over.
      throw Object.assign(new Error(`llm-service returned ${response.status}`), {
        status: response.status,
      });
    }
    return replyText(await response.json());
  };
}
