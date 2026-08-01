import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react';
import type { GigGaugeScenario } from '../calculations/types';
import { createDefaultScenario } from './defaultScenario';
import {
  getSafeLocalStorage,
  loadActiveState,
  saveActiveState,
  type KeyValueStorage,
  type StoredQuickForm,
} from './persistence';
import { ScenarioContext, type ScenarioContextValue } from './useScenario';

const SAVE_DEBOUNCE_MS = 500;

interface ActiveState {
  scenario: GigGaugeScenario;
  quickForm?: StoredQuickForm;
}

interface ScenarioProviderProps {
  children: ReactNode;
  /** Injectable for tests; defaults to guarded window.localStorage. */
  storage?: KeyValueStorage | null;
}

export function ScenarioProvider({ children, storage }: ScenarioProviderProps): ReactElement {
  const [resolvedStorage] = useState<KeyValueStorage | null>(() =>
    storage !== undefined ? storage : getSafeLocalStorage(),
  );

  const [state, setState] = useState<ActiveState>(() => {
    const stored = resolvedStorage ? loadActiveState(resolvedStorage) : null;
    return stored ?? { scenario: createDefaultScenario() };
  });

  const pendingSave = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestState = useRef(state);

  const flushSave = useCallback((): void => {
    if (pendingSave.current !== null) {
      clearTimeout(pendingSave.current);
      pendingSave.current = null;
    }
    if (resolvedStorage) {
      saveActiveState(resolvedStorage, latestState.current.scenario, latestState.current.quickForm);
    }
  }, [resolvedStorage]);

  // Debounced persistence of the active draft.
  useEffect(() => {
    latestState.current = state;
    const timeout = setTimeout(flushSave, SAVE_DEBOUNCE_MS);
    pendingSave.current = timeout;
    return (): void => {
      clearTimeout(timeout);
      if (pendingSave.current === timeout) {
        pendingSave.current = null;
      }
    };
  }, [state, flushSave]);

  // Flush pending writes on tab close/reload and on unmount so a debounced
  // save is never lost to navigation.
  useEffect(() => {
    window.addEventListener('beforeunload', flushSave);
    return (): void => {
      window.removeEventListener('beforeunload', flushSave);
      flushSave();
    };
  }, [flushSave]);

  const setActiveState = useCallback(
    (scenario: GigGaugeScenario, quickForm?: StoredQuickForm): void => {
      setState({ scenario, quickForm });
    },
    [],
  );

  const value = useMemo<ScenarioContextValue>(
    () => ({
      scenario: state.scenario,
      quickForm: state.quickForm,
      storage: resolvedStorage,
      setActiveState,
    }),
    [state, resolvedStorage, setActiveState],
  );

  return <ScenarioContext.Provider value={value}>{children}</ScenarioContext.Provider>;
}
