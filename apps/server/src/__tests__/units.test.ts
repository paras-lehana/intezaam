/**
 * Tests for the small server units: the JSON logger, the concurrency gate, the LRU cache and
 * provenance.
 *
 * Responsibility: pin each unit's contract. Boundary: in-memory only, with a fake clock.
 */
import { OFFLINE_REASONS, type Result, ok, provenanceSchema } from '@intezaam/core';
import { describe, expect, it } from 'vitest';
import { createJsonLogger } from '../logger.js';
import { createConcurrencyGate } from '../services/concurrency.js';
import { createLruCache } from '../services/lru-cache.js';
import { CACHE_ENGINE, createProvenanceTracker } from '../services/provenance.js';
import { createFakeClock } from './helpers.js';

describe('lru cache', () => {
  it('evicts the least recently used entry and expires by TTL', () => {
    const clock = createFakeClock();
    const cache = createLruCache<number>({ maxEntries: 2, ttlMs: 1_000, now: clock.now });
    cache.set('a', 1);
    cache.set('b', 2);
    expect(cache.get('a')).toBe(1);
    cache.set('c', 3);
    expect(cache.get('b')).toBeUndefined();
    expect(cache.size).toBe(2);
    clock.advance(1_000);
    expect(cache.get('a')).toBeUndefined();
    expect(cache.get('missing')).toBeUndefined();
  });
});

describe('concurrency gate', () => {
  it('rejects work beyond the cap and frees slots when tasks finish', async () => {
    const gate = createConcurrencyGate(1);
    let release: (value: Result<string>) => void = () => undefined;
    const pending = gate.run(() => new Promise<Result<string>>((resolve) => (release = resolve)));
    expect(gate.inFlight).toBe(1);
    const rejected = await gate.run(() => Promise.resolve(ok('second')));
    expect(rejected.ok ? 'ok' : rejected.error.code).toBe('RATE_LIMITED');
    release(ok('first'));
    expect(await pending).toEqual(ok('first'));
    expect(gate.inFlight).toBe(0);
  });
});

describe('provenance tracker', () => {
  it('records model and rule steps with total latency', () => {
    const clock = createFakeClock();
    const tracker = createProvenanceTracker(clock.now);
    const startedAt = clock.now();
    clock.advance(5);
    tracker.rules('redact', startedAt);
    tracker.model('explain', 'model-a', 1_200);
    tracker.model('again', 'model-a', 10);
    expect(tracker.build('gemini')).toEqual({
      mode: 'gemini',
      models: ['model-a'],
      latencyMs: 5,
      steps: [
        { name: 'redact', engine: 'rules', ms: 5 },
        { name: 'explain', engine: 'model-a', ms: 1_200 },
        { name: 'again', engine: 'model-a', ms: 10 },
      ],
    });
  });

  it('records a cache hit with the cached models', () => {
    const clock = createFakeClock();
    const cached = createProvenanceTracker(clock.now);
    cached.model('narrate', 'model-b', 900);
    const tracker = createProvenanceTracker(clock.now);
    tracker.cacheHit(cached.build('gemini'), clock.now());
    expect(tracker.build('gemini')).toEqual({
      mode: 'gemini',
      models: ['model-b'],
      latencyMs: 0,
      steps: [{ name: 'cache-hit', engine: CACHE_ENGINE, ms: 0 }],
    });
  });

  it.each(OFFLINE_REASONS)('puts the fallback reason %s on an offline answer only', (reason) => {
    const tracker = createProvenanceTracker(createFakeClock().now);
    tracker.fallback(reason);
    const offline = provenanceSchema.parse(tracker.build('offline'));
    expect(offline).toEqual({ mode: 'offline', reason, models: [], latencyMs: 0, steps: [] });
    expect(tracker.build('gemini')).not.toHaveProperty('reason');
  });

  it('leaves the reason out of an offline answer no model was asked for', () => {
    expect(createProvenanceTracker(createFakeClock().now).build('offline')).not.toHaveProperty(
      'reason',
    );
  });
});

describe('json logger', () => {
  it('writes severity, message and flat fields as one line', () => {
    const lines: string[] = [];
    createJsonLogger((line) => lines.push(line)).log('WARNING', 'hello', { n: 1 });
    expect(JSON.parse(lines[0] ?? '{}')).toEqual({ n: 1, severity: 'WARNING', message: 'hello' });
  });
});
