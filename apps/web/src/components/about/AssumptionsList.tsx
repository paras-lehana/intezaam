/**
 * The assumptions behind the plan: the data gaps we filled ourselves.
 *
 * Responsibility: say plainly where no published source exists and what we assumed
 * instead (the product's data-gap register), so no estimate passes for a fact.
 * Boundary: static copy; each item is labelled grade D in the plan wherever it is used.
 */
import type { ReactElement } from 'react';

export const ASSUMPTIONS = [
  'City costs: eight big cities follow a published per-plate list; every other city is our own tier mapping, which you can change.',
  'Venue rent apart from catering: no source splits them by city tier, so only the share of the budget is used.',
  'Room rates for guests from out of town are working figures, not quotes.',
  'Vendor payments: there is no industry standard, so 30% advance, 40% midway and 30% at the end is our default.',
  'How fixed costs are shared across functions (haldi, sangeet, wedding) is our weighting.',
  'Refreshment and prasad costs per head for community events are not published; only full-meal plate bands are used.',
  'Festival dates for 2026–27 are partly sourced and vary by region; check each one locally.',
  'Muhurat dates outside the curated months are not listed — the plan asks you to check with your priest.',
  'How many invited guests attend is our working rate, not a measured Indian figure.',
  'Vendor questions and the ideas library are our planner checklists, written from published guides.',
  'Sunset time for the Jain meal rule is approximate for your city.',
  'Church banns notice and the Special Marriage Act notice period are not verified here; confirm with your registrar or parish.',
] as const;

export function AssumptionsList(): ReactElement {
  return (
    <section className="card" aria-labelledby="assumptions-heading">
      <h2 id="assumptions-heading">Assumptions we made</h2>
      <p>
        Where no published source exists, we use a working value and label it “Assumption” in your
        plan.
      </p>
      <ul className="assumptions" role="list">
        {ASSUMPTIONS.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  );
}
