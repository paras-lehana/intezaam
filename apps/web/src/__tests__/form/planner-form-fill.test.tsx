/**
 * Responsibility: PlannerForm, part 2 — "Try a sample" fills but never submits and the filled
 * form submits the sample unchanged; "Read my brief" hands the text up or asks for more; a
 * fill from the page lands in the fields; a family change resets the occasion and drops
 * foreign functions. Boundary: expected payloads are derived from core (sampleContext +
 * eventContextSchema).
 */
import { type ReactElement, useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import {
  EVENT_KIND_PROFILES,
  FAMILY_PROFILES,
  FUNCTION_PROFILES,
  SAMPLE_CONTEXTS,
  SAMPLE_IDS,
  kindsOfFamily,
  sampleContext,
} from '@intezaam/core/domain';
import { eventContextSchema } from '@intezaam/core/schemas';
import { BRIEF_BUTTON, BRIEF_TOO_SHORT } from '../../components/form/BriefBox';
import { DEFAULT_SUBMIT_LABEL, PlannerForm } from '../../components/form/PlannerForm';
import type { PlannerFormFill } from '../../components/form/use-planner-form';
import { TEST_TODAY_ISO } from '../helpers';

interface HarnessProps {
  readonly onSubmit: (value: unknown) => void;
  readonly onReadBrief: (text: string) => void;
  readonly fill?: PlannerFormFill;
}

function Harness({ onSubmit, onReadBrief, fill }: HarnessProps): ReactElement {
  return (
    <PlannerForm
      formId="planner"
      todayIso={TEST_TODAY_ISO}
      onSubmit={onSubmit}
      onReadBrief={onReadBrief}
      {...(fill === undefined ? {} : { fill })}
    />
  );
}

const sampleButton = (label: string): HTMLElement =>
  screen.getByRole('button', { name: new RegExp(label) });

describe('samples', () => {
  it.each(SAMPLE_IDS)(
    'fills the %s sample without submitting, then submits it unchanged',
    async (id) => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();
      render(<Harness onSubmit={onSubmit} onReadBrief={vi.fn()} />);
      const sample = sampleContext(id, TEST_TODAY_ISO);
      await user.click(sampleButton(SAMPLE_CONTEXTS[id].label));
      expect(onSubmit).not.toHaveBeenCalled();
      expect(screen.getByRole('combobox', { name: 'City or town' })).toHaveValue(sample.city);
      expect(screen.getByRole('textbox', { name: 'Guests invited' })).toHaveValue(
        String(sample.guests),
      );
      expect(
        screen.getByRole('radio', { name: FAMILY_PROFILES[sample.family].label }),
      ).toBeChecked();
      expect(screen.getByText(/^Filled with the sample/)).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: DEFAULT_SUBMIT_LABEL }));
      expect(onSubmit).toHaveBeenCalledWith(eventContextSchema.parse(sample));
    },
  );
});

describe('Read my brief', () => {
  it('hands the trimmed text to the page', async () => {
    const user = userEvent.setup();
    const onReadBrief = vi.fn();
    render(<Harness onSubmit={vi.fn()} onReadBrief={onReadBrief} />);
    await user.type(
      screen.getByRole('textbox', { name: /Describe it in your words/ }),
      '  Shaadi in Jaipur, 200 log  ',
    );
    await user.click(screen.getByRole('button', { name: BRIEF_BUTTON }));
    expect(onReadBrief).toHaveBeenCalledWith('Shaadi in Jaipur, 200 log');
  });

  it('asks for more words instead of sending an empty brief', async () => {
    const user = userEvent.setup();
    const onReadBrief = vi.fn();
    render(<Harness onSubmit={vi.fn()} onReadBrief={onReadBrief} />);
    await user.click(screen.getByRole('button', { name: BRIEF_BUTTON }));
    expect(onReadBrief).not.toHaveBeenCalled();
    expect(screen.getByText(BRIEF_TOO_SHORT)).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /Describe it in your words/ })).toHaveFocus();
  });
});

describe('fills from the page', () => {
  it('applies a partial fill over typed fields, once per fill id', async () => {
    const user = userEvent.setup();
    function FillHarness(): ReactElement {
      const [fill, setFill] = useState<PlannerFormFill | undefined>(undefined);
      return (
        <>
          <button
            type="button"
            onClick={() =>
              setFill({ id: 1, context: { city: 'Lucknow', guests: 80 }, complete: false })
            }
          >
            Apply brief
          </button>
          <Harness
            onSubmit={vi.fn()}
            onReadBrief={vi.fn()}
            {...(fill === undefined ? {} : { fill })}
          />
        </>
      );
    }
    render(<FillHarness />);
    await user.type(screen.getByRole('combobox', { name: 'City or town' }), 'Agra');
    await user.click(screen.getByRole('radio', { name: FAMILY_PROFILES.community.label }));
    await user.click(screen.getByRole('button', { name: 'Apply brief' }));
    expect(screen.getByRole('combobox', { name: 'City or town' })).toHaveValue('Lucknow');
    expect(screen.getByRole('textbox', { name: 'Guests invited' })).toHaveValue('80');
    expect(screen.getByRole('radio', { name: FAMILY_PROFILES.community.label })).toBeChecked();
  });
});

describe('family choice', () => {
  it('resets the occasion and drops functions from another family', async () => {
    const user = userEvent.setup();
    render(<Harness onSubmit={vi.fn()} onReadBrief={vi.fn()} />);
    await user.click(screen.getByRole('radio', { name: FAMILY_PROFILES.wedding.label }));
    await user.click(screen.getByText('More details'));
    await user.click(screen.getByRole('checkbox', { name: FUNCTION_PROFILES.sangeet.label }));
    await user.click(screen.getByRole('radio', { name: FAMILY_PROFILES.birthday.label }));
    const firstKind = kindsOfFamily('birthday')[0];
    if (firstKind !== undefined) {
      expect(screen.getByRole('combobox', { name: 'Occasion' })).toHaveValue(firstKind);
      expect(
        screen.getByRole('option', { name: EVENT_KIND_PROFILES[firstKind].label }),
      ).toBeInTheDocument();
    }
    expect(
      screen.queryByRole('checkbox', { name: FUNCTION_PROFILES.sangeet.label }),
    ).not.toBeInTheDocument();
  });
});
