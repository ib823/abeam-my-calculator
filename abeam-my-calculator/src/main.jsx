import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';             // keep this import here
import App from './App.jsx';

// React Router imports for routing
import { BrowserRouter, Routes, Route } from 'react-router-dom';

// Conditionally import the proposal suite components
import ProposalRenderer from './features/proposal/ProposalRenderer.jsx';
import InternalCockpit from './features/proposal/InternalCockpit.jsx';

// Feature flags controlled via .env (set to "true" to enable)
const PROPOSAL_RENDERER_ENABLED =
  import.meta.env.VITE_PROPOSAL_RENDERER_ENABLED === 'true';
const COCKPIT_ENABLED =
  import.meta.env.VITE_COCKPIT_ENABLED === 'true';

// Render the application with routing
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        {/* Main estimator */}
        <Route path="/" element={<App />} />

        {/* Client‑facing proposal (enable via .env) */}
        {PROPOSAL_RENDERER_ENABLED && (
          <Route
            path="/proposal/preview"
            element={
              /* Replace {} with your estimator payload */
              <ProposalRenderer payload={{}} proposalId="ABMY-23-Aug-25-001" />
            }
          />
        )}

        {/* Internal resource cockpit (enable via .env) */}
        {COCKPIT_ENABLED && (
          <Route
            path="/proposal/cockpit"
            element={
              /* Replace {} with your estimator payload */
              <InternalCockpit payload={{}} proposalId="ABMY-23-Aug-25-001" />
            }
          />
        )}
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
);
