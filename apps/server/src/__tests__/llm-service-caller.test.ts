/**
 * Tests for services/llm-service-caller.ts against a fake fetch: message building (size limit,
 * the JSON Schema sent exactly once, files) and the /byok request and reply handling.
 *
 * Responsibility: pin the wire format the gateway receives. Boundary: no network.
 */
import { briefModelOutputSchema, buildBriefPrompt, toModelSchema } from '@intezaam/core';
import { describe, expect, it } from 'vitest';
import type { ModelCall } from '../services/genai-client.js';
import {
  MAX_MESSAGE_CHARS,
  createLlmServiceCaller,
  splitText,
  toChatMessages,
} from '../services/llm-service-caller.js';
import type { Fetch } from '../services/http.js';
import { parseJson } from './helpers.js';

const INTERNAL_KEY = 'internal_key_never_logged';
const UPSTREAM_KEY = 'upstream_key_never_logged';

function makeCall(overrides: Partial<ModelCall> = {}): ModelCall {
  return {
    model: 'gemini-test',
    system: 'Explain the plan.',
    prompt: 'The caterer asks for a 50% advance.',
    files: [],
    json: false,
    maxOutputTokens: 2_048,
    signal: new AbortController().signal,
    ...overrides,
  };
}

interface Sent {
  readonly url: string;
  readonly init: RequestInit | undefined;
}

function fakeFetch(respond: () => Response): { fetch: Fetch; sent: Sent[] } {
  const sent: Sent[] = [];
  const fetchImpl: Fetch = (input, init) => {
    sent.push({ url: String(input), init });
    return Promise.resolve(respond());
  };
  return { fetch: fetchImpl, sent };
}

function completion(content: unknown): Response {
  return Response.json({ choices: [{ message: { role: 'assistant', content } }] });
}

function callerWith(fetchImpl: Fetch): ReturnType<typeof createLlmServiceCaller> {
  return createLlmServiceCaller({
    url: 'http://llm-service:8095/',
    internalKey: INTERNAL_KEY,
    upstreamUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    upstreamKey: UPSTREAM_KEY,
    ref: 'intezaam',
    fetch: fetchImpl,
  });
}

function sentBody(sent: Sent[]): unknown {
  const body = sent[0]?.init?.body;
  return parseJson(typeof body === 'string' ? body : '{}');
}

describe('splitText', () => {
  it('keeps text within the limit whole', () => {
    expect(splitText('short')).toEqual(['short']);
  });

  it('cuts after the last newline that fits, and never loses a character', () => {
    const text = `${'a'.repeat(6)}\n${'b'.repeat(6)}\n${'c'.repeat(5)}`;
    const pieces = splitText(text, 10);
    expect(pieces).toEqual([`${'a'.repeat(6)}\n`, `${'b'.repeat(6)}\n`, 'ccccc']);
    expect(pieces.join('')).toBe(text);
  });

  it('cuts hard at the limit when no newline helps', () => {
    expect(splitText('abcdefghij', 4)).toEqual(['abcd', 'efgh', 'ij']);
    expect(splitText('\nabcdefgh', 4)).toEqual(['\nabc', 'defg', 'h']);
  });

  it('keeps every piece of a document within the llm-service limit', () => {
    const doc = Array.from(
      { length: 2_000 },
      (_, i) => `Line ${i}: the caterer serves 300 guests at the sangeet.`,
    ).join('\n');
    const pieces = splitText(doc);
    expect(pieces.length).toBeGreaterThan(1);
    expect(pieces.every((piece) => piece.length <= MAX_MESSAGE_CHARS)).toBe(true);
    expect(pieces.join('')).toBe(doc);
  });
});

describe('toChatMessages', () => {
  it('sends the system instruction and the prompt as plain text', () => {
    expect(toChatMessages(makeCall())).toEqual([
      { role: 'system', content: 'Explain the plan.' },
      { role: 'user', content: 'The caterer asks for a 50% advance.' },
    ]);
  });

  it('sends the JSON Schema of a core prompt exactly once (in the system instruction)', () => {
    const prompt = buildBriefPrompt({
      text: '200 log, 2 lakh',
      todayIso: '2026-10-20',
      nonce: 'a1b2c3d4',
    });
    const messages = toChatMessages(
      makeCall({ system: prompt.systemInstruction, prompt: prompt.prompt, json: true }),
    );
    const schema = JSON.stringify(toModelSchema(briefModelOutputSchema));
    const wire = JSON.stringify(messages.map((message) => message.content));
    expect(wire.split(JSON.stringify(schema).slice(1, -1)).length - 1).toBe(1);
  });

  it('puts files as data URLs before the text of the first message only', () => {
    const long = 'x'.repeat(MAX_MESSAGE_CHARS + 5);
    const messages = toChatMessages(
      makeCall({ prompt: long, files: [{ mimeType: 'application/pdf', dataBase64: 'JVBERi0=' }] }),
    );
    expect(messages).toHaveLength(3);
    expect(messages[1]?.content).toEqual([
      { type: 'image_url', image_url: { url: 'data:application/pdf;base64,JVBERi0=' } },
      { type: 'text', text: 'x'.repeat(MAX_MESSAGE_CHARS) },
    ]);
    expect(messages[2]).toEqual({ role: 'user', content: 'xxxxx' });
  });
});

describe('createLlmServiceCaller', () => {
  it('posts one /byok request through the custom provider and returns the reply text', async () => {
    const { fetch, sent } = fakeFetch(() => completion('{"risk":"high"}'));
    const call = makeCall({ json: true });
    await expect(callerWith(fetch)(call)).resolves.toBe('{"risk":"high"}');
    expect(sent).toHaveLength(1);
    expect(sent[0]?.url).toBe('http://llm-service:8095/byok');
    expect(sent[0]?.init?.signal).toBe(call.signal);
    expect(new Headers(sent[0]?.init?.headers).get('X-Internal-Key')).toBe(INTERNAL_KEY);
    expect(sentBody(sent)).toMatchObject({
      api_key: UPSTREAM_KEY,
      provider: 'custom',
      base_url: 'https://generativelanguage.googleapis.com/v1beta/openai',
      model: 'gemini-test',
      ref: 'intezaam',
      temperature: 0.2,
      max_tokens: 2_048,
      json_mode: true,
      messages: toChatMessages(call),
    });
  });

  it('asks for plain text when there is no schema', async () => {
    const { fetch, sent } = fakeFetch(() => completion('Plain answer'));
    await expect(callerWith(fetch)(makeCall())).resolves.toBe('Plain answer');
    expect(sentBody(sent)).toMatchObject({ json_mode: false });
  });

  it('throws only the HTTP status on failure, so failover can decide and no key leaks', async () => {
    const { fetch } = fakeFetch(() => new Response(`bad key ${INTERNAL_KEY}`, { status: 502 }));
    const failure: unknown = await callerWith(fetch)(makeCall()).catch((error: unknown) => error);
    expect(failure).toMatchObject({ status: 502, message: 'llm-service returned 502' });
    expect(String(failure)).not.toContain(INTERNAL_KEY);
  });

  it.each([
    ['a non-object body', 'null'],
    ['no choices', '{}'],
    ['an empty choice list', '{"choices":[]}'],
    ['a choice without a message', '{"choices":[{}]}'],
    ['a message without content', '{"choices":[{"message":{}}]}'],
    ['non-text content', '{"choices":[{"message":{"content":[{"type":"text"}]}}]}'],
  ])('returns undefined for %s', async (_label, body) => {
    const { fetch } = fakeFetch(
      () => new Response(body, { headers: { 'Content-Type': 'application/json' } }),
    );
    await expect(callerWith(fetch)(makeCall())).resolves.toBeUndefined();
  });
});
