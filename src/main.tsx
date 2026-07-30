import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { App } from './App';
import { Home } from './pages/Home';
import { Plan } from './pages/Plan';
import { QuickEstimate } from './pages/QuickEstimate';
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
