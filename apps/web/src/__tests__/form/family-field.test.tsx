/**
 * Responsibility: the first essential — a family pick is handed up to the form (which resets
 * the occasion), the occasion select appears only for a family with several occasions, a pick
 * there lands in the state, a value outside the family's list is ignored, and the field glows
 * when validation sends the reader here. Boundary: rendered alone in the section harness;
 * families, kinds and labels come from core.
 */
import type { ReactElement } from 'react';
import { fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  EVENT_FAMILIES,
  EVENT_KIND_PROFILES,
  type EventFamily,
  FAMILY_PROFILES,
  kindsOfFamily,
} from '@intezaam/core/domain';
import { FamilyField } from '../../components/form/FamilyField';
import { type SectionProps, plannerFieldId } from '../../components/form/form-fields';
import { renderSection } from './section-harness';

const onFamily = vi.fn<(family: EventFamily) => void>();

function FamilyFieldHost(props: SectionProps): ReactElement {
  return <FamilyField {...props} onFamily={onFamily} />;
}

const [FIRST_BIRTHDAY, OTHER_BIRTHDAY] = kindsOfFamily('birthday');

beforeEach(() => {
  onFamily.mockClear();
});

describe('FamilyField', () => {
  it('hands a family pick up to the form', async () => {
    const { user } = renderSection(FamilyFieldHost);
    await user.click(screen.getByRole('radio', { name: FAMILY_PROFILES.birthday.label }));
    expect(onFamily).toHaveBeenCalledWith('birthday');
  });

  it.each(EVENT_FAMILIES)('asks for the occasion only when %s has several', (family) => {
    const [kind = ''] = kindsOfFamily(family);
    renderSection(FamilyFieldHost, { start: { family, kind } });
    const select = screen.queryByRole('combobox', { name: 'Occasion' });
    expect(select !== null).toBe(kindsOfFamily(family).length > 1);
  });

  it('records the occasion picked, and ignores a value outside the family', async () => {
    expect(OTHER_BIRTHDAY).toBeDefined();
    if (FIRST_BIRTHDAY === undefined || OTHER_BIRTHDAY === undefined) return;
    const { user, latest } = renderSection(FamilyFieldHost, {
      start: { family: 'birthday', kind: FIRST_BIRTHDAY },
    });
    const occasion = screen.getByRole('combobox', { name: 'Occasion' });
    await user.selectOptions(occasion, EVENT_KIND_PROFILES[OTHER_BIRTHDAY].label);
    expect(latest().kind).toBe(OTHER_BIRTHDAY);
    fireEvent.change(occasion, { target: { value: 'not-an-occasion' } });
    expect(latest().kind).toBe(OTHER_BIRTHDAY);
  });

  it('glows when validation points here', () => {
    renderSection(FamilyFieldHost, { attention: 'family' });
    expect(document.getElementById(plannerFieldId('family'))).toHaveClass('field--attention');
  });
});
