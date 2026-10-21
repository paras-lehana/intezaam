/**
 * Food planner (feature #26): quantities, half portions for children, separate counters,
 * the Jain-before-sunset and alcohol-free rules.
 *
 * Responsibility: FOOD-01 grams per adult and the total to cook, raw staples scaled to the
 * cook-for count, the counters the menu needs and each diet rule's checklist (DIET-01…04).
 * Boundary: display only; quantities are planning estimates for the caterer conversation.
 */
import type { ReactElement } from 'react';
import {
  ICE_CREAM_ML_PER_GUEST,
  KIDS_PORTION_FACTOR,
  RAW_GRAMS_PER_GUEST,
} from '@intezaam/core/domain';
import type { FOOD_COUNTERS, Plan } from '@intezaam/core/schemas';
import { PanelSection } from '../common/PanelSection';
import { TraceDisclosure } from '../common/TraceDisclosure';

export interface FoodPlannerProps {
  readonly plan: Plan;
}

type FoodCounter = (typeof FOOD_COUNTERS)[number];

export const COUNTER_LABELS: Readonly<Record<FoodCounter, string>> = {
  veg: 'Vegetarian',
  'non-veg': 'Non-vegetarian',
  jain: 'Jain (no root vegetables, served before sunset)',
  halal: 'Halal',
  satvik: 'Satvik (no onion, no garlic)',
  mocktails: 'Mocktails and soft drinks',
};

type Staple = keyof typeof RAW_GRAMS_PER_GUEST;

const STAPLES: readonly Staple[] = ['rice', 'dal', 'breadFlour', 'sweet'];

const STAPLE_LABELS: Readonly<Record<Staple, string>> = {
  rice: 'Rice',
  dal: 'Dal',
  breadFlour: 'Flour for breads',
  sweet: 'Sweets',
};

const GRAMS_PER_KG = 1_000;
const ML_PER_LITRE = 1_000;
const PERCENT = 100;

function kilos(grams: number): string {
  return `${Math.round(grams / GRAMS_PER_KG)} kg`;
}

export function FoodPlanner({ plan }: FoodPlannerProps): ReactElement {
  const { food, headcount } = plan;
  return (
    <PanelSection id="people-food" title="Food planner">
      <p>
        Plan {food.gramsPerAdult.min}–{food.gramsPerAdult.max} g of food per adult per sitting:
        about{' '}
        <strong>
          {Math.round(food.totalKg.min)}–{Math.round(food.totalKg.max)} kg
        </strong>{' '}
        in all. Children eat about {Math.round(KIDS_PORTION_FACTOR * PERCENT)}% of an adult portion.
      </p>
      <table className="people-table">
        <caption>Raw staples for {headcount.cookFor} people (a vegetarian menu)</caption>
        <tbody>
          {STAPLES.map((staple) => (
            <tr key={staple}>
              <th scope="row">{STAPLE_LABELS[staple]}</th>
              <td>{kilos(RAW_GRAMS_PER_GUEST[staple] * headcount.cookFor)}</td>
            </tr>
          ))}
          <tr>
            <th scope="row">Ice cream</th>
            <td>
              {Math.round((ICE_CREAM_ML_PER_GUEST * headcount.cookFor) / ML_PER_LITRE)} litres
            </td>
          </tr>
        </tbody>
      </table>
      <h4>Counters to set up</h4>
      <ul className="people-chips plain-list" role="list">
        {food.counters.map((counter) => (
          <li key={counter} className="chip">
            {COUNTER_LABELS[counter]}
          </li>
        ))}
      </ul>
      {food.rules.map((rule) => (
        <div key={rule.key} className="people-rule">
          <h4>{rule.title}</h4>
          <ul>
            {rule.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      ))}
      <TraceDisclosure plan={plan} traceIds={food.traceIds} subject="the food plan" />
    </PanelSection>
  );
}
