/**
 * Client key for rate limiting behind Cloudflare → Traefik.
 *
 * Responsibility: name the visitor a request belongs to. With `trust proxy` = 1, `req.ip` is
 * the peer Traefik saw. `CF-Connecting-IP` is trusted ONLY when that peer is inside
 * Cloudflare's published ranges and the header is a valid IP; anything else — including a
 * request sent straight to the origin with a forged header — is keyed on the peer, so a
 * caller cannot mint a fresh rate-limit bucket by changing a header. An IPv6 key is cut to its
 * /64 prefix, so one host cannot mint buckets by rotating through its own subnet either.
 * Boundary: pure; no I/O, and callers log only the source, never the address.
 */
import { BlockList, isIP } from 'node:net';
import { CLOUDFLARE_IPV4_RANGES, CLOUDFLARE_IPV6_RANGES } from './cloudflare-ranges.js';

export const CLIENT_SOURCES = ['cloudflare', 'direct'] as const;

export type ClientSource = (typeof CLIENT_SOURCES)[number];

export interface ClientKey {
  readonly key: string;
  readonly source: ClientSource;
}

/** Fallback key when the socket has no address (some test transports). */
const UNKNOWN_PEER = 'unknown';

/** IPv4 addresses that reach a dual-stack socket arrive as "::ffff:a.b.c.d". */
const IPV4_MAPPED_PREFIX = '::ffff:';

const IPV4 = 4;
const IPV6 = 6;

/** An IPv6 address is eight 16-bit groups (RFC 4291 §2.2). */
const IPV6_GROUPS = 8;

/**
 * A /64 is the first four groups: the size of one end site's LAN (RFC 4291 §2.5.4), which one
 * host can roam freely with privacy addresses (RFC 8981), so it is the smallest fair bucket.
 */
const IPV6_BUCKET_GROUPS = 4;

/** Four hex digits per group; padding makes "db8" and "0db8" one key. */
const HEX_DIGITS_PER_GROUP = 4;

/** The written separator for elided zero groups ("2001:db8::1"). */
const ZERO_RUN = '::';

/** A dotted IPv4 tail ("64:ff9b::192.0.2.1") is one written part that fills two groups. */
const DOTTED_TAIL_EXTRA_GROUPS = 1;

/** Builds the block list once: Node checks membership without parsing CIDRs per request. */
function cloudflareBlockList(): BlockList {
  const list = new BlockList();
  const add = (cidr: string, family: 'ipv4' | 'ipv6'): void => {
    const [address = '', prefix = ''] = cidr.split('/');
    list.addSubnet(address, Number(prefix), family);
  };
  CLOUDFLARE_IPV4_RANGES.forEach((cidr) => add(cidr, 'ipv4'));
  CLOUDFLARE_IPV6_RANGES.forEach((cidr) => add(cidr, 'ipv6'));
  return list;
}

// Efficiency: one immutable list for the process; checks are a lookup, not a parse.
const CLOUDFLARE = cloudflareBlockList();

/**
 * The address without the IPv4-mapped IPv6 prefix.
 * @example
 * unmapIp('::ffff:104.16.0.1'); // '104.16.0.1'
 */
export function unmapIp(ip: string): string {
  const tail = ip.slice(IPV4_MAPPED_PREFIX.length);
  return ip.toLowerCase().startsWith(IPV4_MAPPED_PREFIX) && isIP(tail) === IPV4 ? tail : ip;
}

/**
 * True when the address belongs to a published Cloudflare range.
 * @example
 * isCloudflareIp('172.70.1.9'); // true
 * isCloudflareIp('203.0.113.66'); // false
 */
export function isCloudflareIp(ip: string): boolean {
  const address = unmapIp(ip);
  const family = isIP(address);
  if (family === IPV4) return CLOUDFLARE.check(address, 'ipv4');
  return family === IPV6 && CLOUDFLARE.check(address, 'ipv6');
}

/** The written groups of one side of a "::", and how many of the eight groups they fill. */
function writtenGroups(side: string): { readonly groups: string[]; readonly width: number } {
  const groups = side === '' ? [] : side.split(':');
  const dotted = side.includes('.') ? DOTTED_TAIL_EXTRA_GROUPS : 0;
  return { groups, width: groups.length + dotted };
}

/**
 * The /64 prefix of a valid IPv6 address, in one canonical spelling.
 * @example
 * ipv6Bucket('2409:4050:2E0B::1'); // '2409:4050:2e0b:0000::/64'
 * ipv6Bucket('fe80::1%eth0'); // 'fe80:0000:0000:0000::/64'
 */
export function ipv6Bucket(address: string): string {
  // A zone id ("%eth0") names the receiving interface, not part of the sender's address.
  const [bare = ''] = address.split('%');
  const [head = '', tail = ''] = bare.split(ZERO_RUN);
  const left = writtenGroups(head);
  const right = writtenGroups(tail);
  // Without "::" the left side already fills all eight groups, so no zeros are inserted.
  const zeros = Array.from({ length: IPV6_GROUPS - left.width - right.width }, () => '0');
  // Efficiency: only the four prefix groups are padded; the interface half is never read.
  const prefix = [...left.groups, ...zeros, ...right.groups]
    .slice(0, IPV6_BUCKET_GROUPS)
    .map((group) => group.toLowerCase().padStart(HEX_DIGITS_PER_GROUP, '0'));
  return `${prefix.join(':')}::/64`;
}

/** IPv4 addresses (and the "unknown" fallback) bucket as they are; IPv6 by its /64. */
function bucketOf(address: string): string {
  return isIP(address) === IPV6 ? ipv6Bucket(address) : address;
}

/**
 * The rate-limit key for a request.
 * @example
 * clientKey('172.70.1.9', '49.36.10.20'); // { key: '49.36.10.20', source: 'cloudflare' }
 * clientKey('203.0.113.66', '1.2.3.4'); // { key: '203.0.113.66', source: 'direct' } (forged header ignored)
 * clientKey('2400:cb00::1', '2409:4050:2e0b::1'); // { key: '2409:4050:2e0b:0000::/64', source: 'cloudflare' }
 */
export function clientKey(
  peerIp: string | undefined,
  cfConnectingIp: string | undefined,
): ClientKey {
  const peer = unmapIp(peerIp ?? UNKNOWN_PEER);
  const claimed = unmapIp(cfConnectingIp?.trim() ?? '');
  // Security: the header is believed only from Cloudflare's own edges (CVE-2026-43634 pattern).
  return isCloudflareIp(peer) && isIP(claimed) !== 0
    ? { key: bucketOf(claimed), source: 'cloudflare' }
    : { key: bucketOf(peer), source: 'direct' };
}
