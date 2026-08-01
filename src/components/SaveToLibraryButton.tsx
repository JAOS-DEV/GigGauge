import { useState, type ReactElement } from 'react';
import { Save } from 'lucide-react';
import {
  promptAndSaveActiveDraftToLibrary,
  SAVED_SCENARIOS_SOFT_CAP,
} from '../state/savedScenarios';
import { useScenario } from '../state/useScenario';

interface SaveToLibraryButtonProps {
  /** Visual weight; Plan/Quick use secondary so primary CTAs stay page-specific. */
  variant?: 'primary' | 'secondary';
}

export function SaveToLibraryButton({
  variant = 'secondary',
}: SaveToLibraryButtonProps): ReactElement {
  const { scenario, quickForm, storage } = useScenario();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSave = (): void => {
    setMessage(null);
    setError(null);
    const result = promptAndSaveActiveDraftToLibrary(storage, scenario, quickForm);
    if (result.status === 'cancelled') {
      return;
    }
    if (result.status === 'unavailable') {
      setError('Saving is unavailable in this browser (storage blocked).');
      return;
    }
    if (result.status === 'full') {
      setError(
        `You already have ${SAVED_SCENARIOS_SOFT_CAP} saved scenarios. Delete or export some on Scenarios before saving another.`,
      );
      return;
    }
    setMessage(`Saved “${result.entry.scenario.name}” to your library.`);
  };

  const buttonClass =
    variant === 'primary'
      ? 'inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-950 px-4 text-base font-semibold text-white hover:bg-blue-900'
      : 'inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-base font-semibold text-blue-950 hover:border-blue-700';

  return (
    <div className="flex flex-col gap-2">
      <button type="button" onClick={handleSave} className={buttonClass}>
        <Save aria-hidden="true" className="h-5 w-5" />
        Save current plan
      </button>
      {message ? (
        <p role="status" className="text-sm text-emerald-800">
          {message}
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}
