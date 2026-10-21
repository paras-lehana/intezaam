/**
 * Browser entry point.
 *
 * Responsibility: apply the stored display preferences, load the fonts and styles, and
 * mount the app with the history router. Boundary: no logic here; routes and layout live
 * in App.tsx. Fonts are self-hosted files bundled from npm (no external requests). Only the
 * shell's styles load here; the planner form, the tabs and About bring their own CSS with
 * their lazy chunk. split.css stays global because print.css (last) must override it.
 */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './App';
import { applyStoredPreferences } from './lib/preferences';
import './styles/fonts.css';
import './styles/tokens.css';
import './styles/base.css';
import './styles/primitives.css';
import './styles/surfaces.css';
import './styles/buttons.css';
import './styles/layout.css';
import './styles/home.css';
import './styles/ledger-card.css';
import './styles/bento.css';
import './styles/forms.css';
import './styles/split.css';
import './styles/print.css';

// Before the first render, so a reader who chose dark never sees an ivory flash.
applyStoredPreferences();

const container = document.getElementById('root');
if (container !== null) {
  createRoot(container).render(
    <StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </StrictMode>,
  );
}
