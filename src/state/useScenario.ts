import { createContext, useContext } from 'react';
import type { GigGaugeScenario } from '../calculations/types';
import type { StoredQuickForm } from './persistence';

export interface ScenarioContextValue {
  scenario: GigGaugeScenario;
  quickForm?: StoredQuickForm;
  /** Replaces the active draft (scenario plus the raw quick-form values that produced it). */
  setActiveState: (scenario: GigGaugeScenario, quickForm?: StoredQuickForm) => void;
}

export const ScenarioContext = createContext<ScenarioContextValue | null>(null);

export function useScenario(): ScenarioContextValue {
  const context = useContext(ScenarioContext);
  if (!context) {
    throw new Error('useScenario must be used within a ScenarioProvider');
  }
  return context;
}
