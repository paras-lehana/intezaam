/**
 * Responsibility: the not-found page — one h1, a page title and two ways back. Boundary:
 * static page; routing to it is covered in layout.test.tsx.
 */
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { pageTitle } from '../../lib/use-page-title';
import { NOT_FOUND_TITLE, NotFoundPage } from '../../pages/NotFoundPage';
import { renderAt } from '../helpers';

describe('NotFoundPage', () => {
  it('says the page is missing and offers the planner and home', () => {
    renderAt(<NotFoundPage />, '/nope');
    expect(screen.getByRole('heading', { level: 1, name: NOT_FOUND_TITLE })).toBeInTheDocument();
    expect(document.title).toBe(pageTitle(NOT_FOUND_TITLE));
    expect(screen.getByRole('link', { name: 'Open the planner' })).toHaveAttribute('href', '/plan');
    expect(screen.getByRole('link', { name: 'Go to the home page' })).toHaveAttribute('href', '/');
  });
});
