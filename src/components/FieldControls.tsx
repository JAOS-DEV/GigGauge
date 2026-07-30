import {
  useState,
  type ReactElement,
  type ReactNode,
  type SelectHTMLAttributes,
} from 'react';
import type { InputHTMLAttributes } from 'react';

const inputClasses =
  'w-full min-h-12 rounded-lg border border-slate-300 bg-white px-3 text-base text-slate-900 ' +
  'focus:border-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-700/30';

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  id: string;
  label: string;
  error?: string;
  /** Short helper shown under the field (keep under ~100 characters). */
  hint?: string;
}

export function TextField({ id, label, error, hint, ...inputProps }: TextFieldProps): ReactElement {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium text-slate-700">
        {label}
      </label>
      <input
        id={id}
        className={inputClasses}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
        {...inputProps}
      />
      {hint && !error ? (
        <p id={`${id}-hint`} className="text-sm text-slate-500">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-sm font-medium text-red-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}

interface DraftNumberFieldProps {
  id: string;
  label: string;
  value: number;
  /** Called only with values that pass min/max (and are finite). */
  onCommit: (value: number) => void;
  min: number;
  max: number;
  /** When true, only whole numbers are committed. */
  integer?: boolean;
  inputMode?: 'numeric' | 'decimal';
  hint?: string;
  error?: string;
}

/**
 * Controlled number input that allows the field to be emptied while typing.
 * Invalid/empty drafts are kept locally; the last committed value is restored on blur.
 */
export function DraftNumberField({
  id,
  label,
  value,
  onCommit,
  min,
  max,
  integer = true,
  inputMode = 'numeric',
  hint,
  error,
}: DraftNumberFieldProps): ReactElement {
  // null means "show the committed value"; a string is an in-progress edit.
  const [draft, setDraft] = useState<string | null>(null);
  const display = draft ?? String(value);

  const tryCommit = (raw: string): void => {
    if (raw.trim() === '') {
      return;
    }
    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) {
      return;
    }
    if (integer && !Number.isInteger(parsed)) {
      return;
    }
    if (parsed < min || parsed > max) {
      return;
    }
    onCommit(parsed);
  };

  return (
    <TextField
      id={id}
      label={label}
      inputMode={inputMode}
      hint={hint}
      error={error}
      value={display}
      onFocus={() => setDraft(String(value))}
      onBlur={() => {
        if (draft === null) {
          return;
        }
        const parsed = Number(draft);
        const valid =
          draft.trim() !== '' &&
          Number.isFinite(parsed) &&
          (!integer || Number.isInteger(parsed)) &&
          parsed >= min &&
          parsed <= max;
        if (valid) {
          onCommit(parsed);
        }
        setDraft(null);
      }}
      onChange={(event) => {
        const raw = event.target.value;
        // Allow empty and partial numeric typing (including a trailing decimal for non-integers).
        if (raw === '' || /^-?\d*\.?\d*$/.test(raw)) {
          setDraft(raw);
          tryCommit(raw);
        }
      }}
    />
  );
}

interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  id: string;
  label: string;
  error?: string;
  children: ReactNode;
}

export function SelectField({
  id,
  label,
  error,
  children,
  ...selectProps
}: SelectFieldProps): ReactElement {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium text-slate-700">
        {label}
      </label>
      <select
        id={id}
        className={inputClasses}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        {...selectProps}
      >
        {children}
      </select>
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-sm font-medium text-red-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}

interface CheckboxFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  id: string;
  label: string;
}

export function CheckboxField({ id, label, ...inputProps }: CheckboxFieldProps): ReactElement {
  return (
    <label htmlFor={id} className="flex min-h-11 items-center gap-3 text-base text-slate-700">
      <input
        id={id}
        type="checkbox"
        className="h-5 w-5 rounded border-slate-300 text-blue-800 focus:ring-blue-700/40"
        {...inputProps}
      />
      {label}
    </label>
  );
}
