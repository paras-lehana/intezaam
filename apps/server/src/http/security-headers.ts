/**
 * Security headers for every response.
 *
 * Responsibility: a strict Content-Security-Policy (same-origin scripts, styles, fonts and
 * fetches; no `unsafe-inline`, no frames, no plugins), cross-origin isolation of the opener and
 * resources, two-year HSTS with preload, a strict referrer policy, and a Permissions-Policy that
 * turns every powerful browser feature off (the planner needs none of them).
 * Boundary: headers only; helmet also removes risky defaults such as X-Powered-By.
 */
import type { RequestHandler } from 'express';
import helmet from 'helmet';

/** Two years, the HSTS preload-list minimum. */
const HSTS_MAX_AGE_SECONDS = 63_072_000;

/** Every feature off: no camera, microphone, location, motion sensors, payments or USB. */
export const PERMISSIONS_POLICY = [
  'accelerometer=()',
  'camera=()',
  'display-capture=()',
  'geolocation=()',
  'gyroscope=()',
  'magnetometer=()',
  'microphone=()',
  'midi=()',
  'payment=()',
  'usb=()',
].join(', ');

/**
 * helmet configured with the app's CSP and hardening headers.
 * @example
 * app.use(securityHeaders());
 */
export function securityHeaders(): RequestHandler {
  const self = "'self'";
  return helmet({
    contentSecurityPolicy: {
      useDefaults: false,
      directives: {
        defaultSrc: [self],
        scriptSrc: [self],
        styleSrc: [self],
        imgSrc: [self, 'data:'],
        connectSrc: [self],
        fontSrc: [self],
        objectSrc: ["'none'"],
        baseUri: [self],
        frameAncestors: ["'none'"],
        formAction: [self],
      },
    },
    crossOriginOpenerPolicy: { policy: 'same-origin' },
    crossOriginResourcePolicy: { policy: 'same-origin' },
    strictTransportSecurity: {
      maxAge: HSTS_MAX_AGE_SECONDS,
      includeSubDomains: true,
      preload: true,
    },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  });
}

/**
 * Adds the Permissions-Policy header (helmet does not set it).
 * @example
 * app.use(permissionsPolicy());
 */
export function permissionsPolicy(): RequestHandler {
  return (_req, res, next) => {
    res.setHeader('Permissions-Policy', PERMISSIONS_POLICY);
    next();
  };
}
