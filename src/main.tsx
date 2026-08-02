import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { registerSW } from 'virtual:pwa-register';
import { App } from './App';
import { About } from './pages/About';
import { Compare } from './pages/Compare';
import { Home } from './pages/Home';
import { Plan } from './pages/Plan';
import { QuickEstimate } from './pages/QuickEstimate';
import { Scenarios } from './pages/Scenarios';
import { TimeOff } from './pages/TimeOff';
import { Tracker } from './pages/Tracker';
import { ScenarioProvider } from './state/scenarioContext';
import './index.css';

const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <Home /> },
      { path: 'quick', element: <QuickEstimate /> },
      { path: 'plan', element: <Plan /> },
      { path: 'time-off', element: <TimeOff /> },
      { path: 'scenarios', element: <Scenarios /> },
      { path: 'compare', element: <Compare /> },
      { path: 'tracker', element: <Tracker /> },
      { path: 'about', element: <About /> },
    ],
  },
]);

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element not found');
}

createRoot(rootElement).render(
  <StrictMode>
    <ScenarioProvider>
      <RouterProvider router={router} />
    </ScenarioProvider>
  </StrictMode>,
);

registerSW({ immediate: true });
