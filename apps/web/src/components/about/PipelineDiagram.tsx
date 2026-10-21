/**
 * The GenAI pipeline as an HTML/CSS flow diagram: which steps Gemini does and which code does.
 *
 * Responsibility: show the principle "GenAI reads and writes; code decides" as the order
 * work actually happens in, with each stage tagged by who runs it (in words, never colour
 * alone). Boundary: static copy; an ordered list so the diagram reads correctly without CSS.
 */
import type { ReactElement } from 'react';

export const PIPELINE_ENGINES = ['code', 'gemini'] as const;

export type PipelineEngine = (typeof PIPELINE_ENGINES)[number];

const ENGINE_LABELS: Readonly<Record<PipelineEngine, string>> = {
  code: 'Code decides',
  gemini: 'Gemini reads or writes',
};

interface PipelineStage {
  readonly name: string;
  readonly engine: PipelineEngine;
  readonly detail: string;
}

export const PIPELINE_STAGES: readonly PipelineStage[] = [
  {
    name: 'Clean and mask',
    engine: 'code',
    detail:
      'Hidden control characters are stripped and phone numbers, email addresses and ID numbers are masked before any text reaches a model.',
  },
  {
    name: 'Read your brief',
    engine: 'gemini',
    detail:
      'Finds the event, city, guests, budget and date in your words. Each field must quote your text, and amounts such as “2 lakh” are parsed by code.',
  },
  {
    name: 'Make the plan',
    engine: 'code',
    detail:
      'Deterministic engines compute the verdict, budget, timeline, vendors, headcount, permissions and risks, and record every rule that fired.',
  },
  {
    name: 'Explain and suggest',
    engine: 'gemini',
    detail:
      'One call explains the plan and suggests ideas inside your limits. Any number that is not in the plan is removed; ideas carry cost bands, never rupees.',
  },
  {
    name: 'Ask, compare, draft',
    engine: 'gemini',
    detail:
      'Reads vendor quotes, answers questions from the plan and drafts messages. A change it proposes is a typed edit that you approve.',
  },
  {
    name: 'Check and fall back',
    engine: 'code',
    detail:
      'Every model answer is validated against a schema. If no model answers, a labelled offline planner returns the same shapes, so the plan always works.',
  },
];

export function PipelineDiagram(): ReactElement {
  return (
    <section className="card" aria-labelledby="pipeline-heading">
      <h2 id="pipeline-heading">GenAI reads and writes; code decides</h2>
      <p>
        Gemini handles what rules cannot: messy Hinglish briefs, free-form vendor quotes, ideas and
        messages in your language. Money, dates, counts and checklists always come from tested code,
        so the same details always give the same plan.
      </p>
      <ol className="plain-list pipeline" role="list">
        {PIPELINE_STAGES.map((stage) => (
          <li key={stage.name} className={`pipeline__stage pipeline__stage--${stage.engine}`}>
            <h3 className="pipeline__name">{stage.name}</h3>
            <p className="pipeline__engine kicker">{ENGINE_LABELS[stage.engine]}</p>
            <p className="pipeline__detail">{stage.detail}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
