/**
 * Tests for http/client-key.ts: the rate-limit key behind Cloudflare → Traefik, in the eight
 * scenarios of research note 09 Gap 4 §4.3.2, edge cases, IPv6 /64 bucketing, and the limiter
 * wired into the app.
 *
 * Responsibility: prove a forged CF-Connecting-IP sent straight to the origin never mints a new
 * bucket, nor does an IPv6 host rotating through its own /64, while real visitors behind one
 * Cloudflare edge get their own. Boundary: in-process Express apps with `trust proxy` = 1,
 * headers set to what Traefik forwards.
 */
import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { clientKey, ipv6Bucket, isCloudflareIp, unmapIp } from '../http/client-key.js';
import { AI_REQUESTS_PER_MINUTE } from '../server.js';
import { makeApp, parseJson } from './helpers.js';

/** Echoes the key the app derives, with Express computing `req.ip` exactly as in production. */
function probeApp(): express.Express {
  const app = express();
  app.set('trust proxy', 1);
  app.get('/', (req, res) => {
    res.json(clientKey(req.ip, req.get('cf-connecting-ip')));
  });
  return app;
}

const EDGE = '172.70.1.9';
const ATTACKER = '203.0.113.66';
const IPV6_EDGE = '2400:cb00:2049::1';
const IPV6_VISITOR = '2409:4050:2e0b::1';

describe('clientKey in the eight hop-chain scenarios', () => {
  it.each([
    ['1 a visitor through a Cloudflare edge', EDGE, '49.36.10.20', '49.36.10.20', 'cloudflare'],
    ['2 a second visitor through the same edge', EDGE, '106.51.3.4', '106.51.3.4', 'cloudflare'],
    [
      '3 a visitor whose forged header Cloudflare overwrote',
      EDGE,
      '49.36.10.21',
      '49.36.10.21',
      'cloudflare',
    ],
    ['4 a direct hit on the origin with a forged header', ATTACKER, '1.2.3.4', ATTACKER, 'direct'],
    [
      '5 a direct hit with a forged X-Forwarded-For too',
      `5.6.7.8, ${ATTACKER}`,
      '5.6.7.8',
      ATTACKER,
      'direct',
    ],
    [
      '6 a direct hit forging a Cloudflare address',
      `104.16.0.1, ${ATTACKER}`,
      '9.9.9.9',
      ATTACKER,
      'direct',
    ],
    [
      '7 an IPv6 visitor through an IPv6 edge',
      IPV6_EDGE,
      IPV6_VISITOR,
      ipv6Bucket(IPV6_VISITOR),
      'cloudflare',
    ],
    ['8 a Cloudflare edge with a malformed header', EDGE, 'not-an-ip', EDGE, 'direct'],
  ])('%s', async (_label, forwardedFor, cfHeader, key, source) => {
    const res = await request(probeApp())
      .get('/')
      .set('X-Forwarded-For', forwardedFor)
      .set('CF-Connecting-IP', cfHeader);
    expect(parseJson(res.text)).toEqual({ key, source });
  });
});

describe('client key edge cases', () => {
  it('unmaps IPv4-mapped IPv6 peers and headers', () => {
    expect(unmapIp('::ffff:104.16.0.1')).toBe('104.16.0.1');
    expect(unmapIp('::ffff:not-ip')).toBe('::ffff:not-ip');
    expect(clientKey('::ffff:104.16.0.1', '::ffff:49.36.10.20')).toEqual({
      key: '49.36.10.20',
      source: 'cloudflare',
    });
  });

  it('keys on the peer for an empty header, two addresses in one header, or no peer at all', () => {
    expect(clientKey(EDGE, '')).toEqual({ key: EDGE, source: 'direct' });
    expect(clientKey(EDGE, '1.1.1.1, 2.2.2.2')).toEqual({ key: EDGE, source: 'direct' });
    expect(clientKey(undefined, '1.1.1.1')).toEqual({ key: 'unknown', source: 'direct' });
  });

  it('matches the first and last address of a v4 and a v6 range, and nothing outside', () => {
    expect(isCloudflareIp('104.16.0.0')).toBe(true);
    expect(isCloudflareIp('104.23.255.255')).toBe(true);
    expect(isCloudflareIp('104.24.0.0')).toBe(true);
    expect(isCloudflareIp('2606:4700::')).toBe(true);
    expect(isCloudflareIp('2606:4700:ffff:ffff:ffff:ffff:ffff:ffff')).toBe(true);
    expect(isCloudflareIp('2606:4701::')).toBe(false);
    expect(isCloudflareIp('103.21.243.255')).toBe(false);
    expect(isCloudflareIp('garbage')).toBe(false);
  });
});

describe('IPv6 keys bucket by /64', () => {
  it('spells a /64 one way, whatever the case, zero padding or "::" placement', () => {
    expect(ipv6Bucket('2409:4050:2E0B::1')).toBe('2409:4050:2e0b:0000::/64');
    expect(ipv6Bucket('2409:4050:2e0b:0:1::')).toBe(ipv6Bucket('2409:4050:2e0b::1'));
    expect(ipv6Bucket('2001:db8:1:2:3:4:5:6')).toBe('2001:0db8:0001:0002::/64');
    expect(ipv6Bucket('::')).toBe('0000:0000:0000:0000::/64');
  });

  it('reads zone ids and dotted IPv4 tails without shifting the prefix', () => {
    expect(ipv6Bucket('fe80::1%eth0')).toBe(ipv6Bucket('fe80::1'));
    expect(ipv6Bucket('64:ff9b::192.0.2.1')).toBe('0064:ff9b:0000:0000::/64');
    expect(ipv6Bucket('1:2:3:4:5:6:192.0.2.1')).toBe('0001:0002:0003:0004::/64');
  });

  it('gives every address in one /64 the same key and a neighbouring /64 another', () => {
    const first = clientKey(IPV6_EDGE, '2409:4050:2e0b:7::1').key;
    expect(clientKey(IPV6_EDGE, '2409:4050:2e0b:7:ffff:ffff:ffff:ffff').key).toBe(first);
    expect(clientKey(IPV6_EDGE, '2409:4050:2e0b:8::1').key).not.toBe(first);
  });

  it('buckets a direct IPv6 peer by /64 and leaves IPv4 keys whole', () => {
    expect(clientKey('2001:db8:1:2:3:4:5:6', '1.2.3.4')).toEqual({
      key: ipv6Bucket('2001:db8:1:2::'),
      source: 'direct',
    });
    expect(clientKey(EDGE, '49.36.10.20').key).toBe('49.36.10.20');
  });
});

/** Sends one more empty AI request than a full bucket holds; returns every status in order. */
async function burst(
  app: express.Express,
  headers: (index: number) => Record<string, string>,
): Promise<number[]> {
  const statuses: number[] = [];
  for (let index = 0; index <= AI_REQUESTS_PER_MINUTE; index += 1) {
    const res = await request(app).post('/api/ask').set(headers(index)).send({});
    statuses.push(res.status);
  }
  return statuses;
}

describe('the limiter in the app', () => {
  it('gives two visitors behind one Cloudflare edge separate buckets', async () => {
    const { app } = makeApp();
    const first = await burst(app, () => ({
      'X-Forwarded-For': EDGE,
      'CF-Connecting-IP': '49.36.10.20',
    }));
    expect(first.at(-1)).toBe(429);
    const other = await request(app)
      .post('/api/ask')
      .set({ 'X-Forwarded-For': EDGE, 'CF-Connecting-IP': '106.51.3.4' })
      .send({});
    expect(other.status).toBe(400);
  });

  it('puts forged headers sent straight to the origin into one bucket, with Retry-After', async () => {
    const { app } = makeApp();
    const statuses = await burst(app, (index) => ({
      'X-Forwarded-For': ATTACKER,
      'CF-Connecting-IP': `1.2.3.${index}`,
    }));
    expect(statuses.slice(0, AI_REQUESTS_PER_MINUTE).every((status) => status === 400)).toBe(true);
    expect(statuses.at(-1)).toBe(429);
    const limited = await request(app)
      .post('/api/ask')
      .set({ 'X-Forwarded-For': ATTACKER })
      .send({});
    expect(limited.headers['retry-after']).toMatch(/^\d+$/);
  });

  it('puts an IPv6 visitor rotating through its /64 into one bucket', async () => {
    const { app } = makeApp();
    const statuses = await burst(app, (index) => ({
      'X-Forwarded-For': IPV6_EDGE,
      'CF-Connecting-IP': `2409:4050:2e0b:0:${index.toString(16)}::1`,
    }));
    expect(statuses.slice(0, AI_REQUESTS_PER_MINUTE).every((status) => status === 400)).toBe(true);
    expect(statuses.at(-1)).toBe(429);
  });
});
