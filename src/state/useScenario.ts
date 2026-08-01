import { createContext, useContext } from 'react';
import type { GigGaugeScenario } from '../calculations/types';
import type { KeyValueStorage, StoredQuickForm } from './persistence';

export interface ScenarioContextValue {
  scenario: GigGaugeScenario;
  quickForm?: StoredQuickForm;
  /** Same store used for the active draft; also used for the saved-scenarios library. */
  storage: KeyValueStorage | null;
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
