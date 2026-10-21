/**
 * The Google services Intezaam uses — and the ones it declined — loaded from the server.
 *
 * Responsibility: render the live catalog (one constant in core feeds the API, this page
 * and the README), implemented services first, each with its status in words, its purpose
 * and the NAMES of any settings it reads. Boundary: the catalog is fetched, never copied
 * here, so the page cannot drift from what the deployment reports.
 */
import { type ReactElement, useEffect, useState } from 'react';
import type { GoogleServiceEntry, GoogleServiceStatus } from '@intezaam/core/schemas';
import { fetchGoogleServices } from '../../lib/api';

const STATUS_TEXT: Readonly<Record<GoogleServiceStatus, string>> = {
  implemented: 'Implemented',
  declined: 'Declined',
};

/** Implemented services lead; declined ones follow with their reason. */
const STATUS_ORDER: Readonly<Record<GoogleServiceStatus, number>> = { implemented: 0, declined: 1 };

type LoadState =
  | { readonly status: 'loading' }
  | { readonly status: 'ok'; readonly services: readonly GoogleServiceEntry[] }
  | { readonly status: 'error' };

function byStatus(services: readonly GoogleServiceEntry[]): GoogleServiceEntry[] {
  return [...services].sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status]);
}

export function GoogleServices(): ReactElement {
  const [state, setState] = useState<LoadState>({ status: 'loading' });

  useEffect(() => {
    const controller = new AbortController();
    // The shared API client validates the body with the core schema and never throws, so a
    // network failure, an error status and an off-contract body all land on 'error'.
    void fetchGoogleServices(controller.signal).then((result) => {
      if (controller.signal.aborted) return;
      setState(result.ok ? { status: 'ok', services: result.value.services } : { status: 'error' });
    });
    return () => controller.abort();
  }, []);

  return (
    <section
      className="card"
      aria-labelledby="google-heading"
      aria-busy={state.status === 'loading'}
    >
      <h2 id="google-heading">Google services</h2>
      {state.status === 'loading' ? <p>Loading the list of services…</p> : null}
      {state.status === 'error' ? (
        <p className="notice">
          The service list could not be loaded right now. Please try again in a moment.
        </p>
      ) : null}
      {state.status === 'ok' ? (
        <ul className="plain-list service-list" role="list">
          {byStatus(state.services).map((service) => (
            <li key={service.id} className={`service service--${service.status}`}>
              <h3 className="service__name">{service.name}</h3>
              <p className="service__status kicker">{STATUS_TEXT[service.status]}</p>
              <p className="service__purpose">{service.purpose}</p>
              {service.envVars.length === 0 ? null : (
                <p className="service__env">
                  Settings: <code>{service.envVars.join(', ')}</code>
                </p>
              )}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
