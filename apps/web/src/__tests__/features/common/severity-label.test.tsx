/**
 * Responsibility: severity is never shown by colour alone — every level has words and its own
 * decorative shape, and the sort order puts the most severe first. Boundary: severities come
 * from core's closed union via the component's own table.
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { RISK_SEVERITIES } from '@intezaam/core/schemas';
import {
  SEVERITY_ORDER,
  SEVERITY_STYLES,
  SeverityLabel,
} from '../../../components/features/common/SeverityLabel';

describe('SeverityLabel', () => {
  it.each(RISK_SEVERITIES)('names %s in words with a hidden shape', (severity) => {
    render(<SeverityLabel severity={severity} />);
    const { label, glyph } = SEVERITY_STYLES[severity];
    expect(screen.getByText(label)).toBeInTheDocument();
    expect(screen.getByText(glyph)).toHaveAttribute('aria-hidden', 'true');
  });

  it('gives every level a distinct shape and label', () => {
    const styles = RISK_SEVERITIES.map((severity) => SEVERITY_STYLES[severity]);
    expect(new Set(styles.map((style) => style.glyph)).size).toBe(RISK_SEVERITIES.length);
    expect(new Set(styles.map((style) => style.label)).size).toBe(RISK_SEVERITIES.length);
  });

  it('orders blocker before high before medium before info', () => {
    const sorted = [...RISK_SEVERITIES].sort((a, b) => SEVERITY_ORDER[a] - SEVERITY_ORDER[b]);
    expect(sorted).toEqual(['blocker', 'high', 'medium', 'info']);
  });
});
