/**
 * Route table and app shell.
 *
 * Responsibility: map URLs to pages inside the shared layout — "/" home, "/plan" the
 * planner workspace, "/about" how it works, anything else the 404 page. Boundary: the
 * router itself is supplied by the caller (BrowserRouter in the browser, MemoryRouter in
 * tests); the layout's Suspense boundary covers the lazily loaded pages.
 */
import { type ReactElement, lazy } from 'react';
import { Route, Routes } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { HomePage } from './pages/HomePage';
import { NotFoundPage } from './pages/NotFoundPage';

// Efficiency: the planner (form, engine and workspace panels) loads only when /plan is
// visited, so the home page paints without the planning engine in its bundle.
const PlanPage = lazy(async () => {
  const module = await import('./pages/PlanPage');
  return { default: module.PlanPage };
});

// Efficiency: About is read once; the pipeline, sources register and catalog load on visit.
const AboutPage = lazy(async () => {
  const module = await import('./pages/AboutPage');
  return { default: module.AboutPage };
});

export function App(): ReactElement {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="plan" element={<PlanPage />} />
        <Route path="about" element={<AboutPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
