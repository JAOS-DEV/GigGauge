import type { ReactElement, ReactNode, SelectHTMLAttributes } from 'react';
import type { InputHTMLAttributes } from 'react';

const inputClasses =
  'w-full min-h-12 rounded-lg border border-slate-300 bg-white px-3 text-base text-slate-900 ' +
  'focus:border-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-700/30';

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  id: string;
  label: string;
  error?: string;
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
