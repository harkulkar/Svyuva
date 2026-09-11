import { forwardRef, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';

type FieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
};

export const TextField = forwardRef<HTMLInputElement, FieldProps>(function TextField(
  { label, error, id, required, className, ...props },
  ref
) {
  const fieldId = id ?? props.name;
  const errorId = error && fieldId ? `${fieldId}-error` : undefined;
  return (
    <div className="space-y-1">
      <label htmlFor={fieldId} className="block text-sm font-medium text-navy">
        {label}
        {required ? <span className="text-red-700"> *</span> : null}
      </label>
      <input
        {...props}
        id={fieldId}
        ref={ref}
        aria-invalid={Boolean(error)}
        aria-required={required || undefined}
        aria-describedby={errorId}
        className={`min-h-11 w-full border px-3 py-2 text-sm ${error ? 'border-red-600' : 'border-slate-300'} focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy focus:ring-offset-1 ${className ?? ''}`}
      />
      {error ? (
        <p id={errorId} className="text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
});

type AreaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string;
  error?: string;
  required?: boolean;
};

export const TextAreaField = forwardRef<HTMLTextAreaElement, AreaProps>(function TextAreaField(
  { label, error, id, required, className, ...props },
  ref
) {
  const fieldId = id ?? props.name;
  const errorId = error && fieldId ? `${fieldId}-error` : undefined;
  return (
    <div className="space-y-1">
      <label htmlFor={fieldId} className="block text-sm font-medium text-navy">
        {label}
        {required ? <span className="text-red-700"> *</span> : null}
      </label>
      <textarea
        {...props}
        id={fieldId}
        ref={ref}
        aria-invalid={Boolean(error)}
        aria-required={required || undefined}
        aria-describedby={errorId}
        className={`min-h-11 w-full border px-3 py-2 text-sm ${error ? 'border-red-600' : 'border-slate-300'} focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy focus:ring-offset-1 ${className ?? ''}`}
      />
      {error ? (
        <p id={errorId} className="text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
});

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  error?: string;
  required?: boolean;
};

export const SelectField = forwardRef<HTMLSelectElement, SelectProps>(function SelectField(
  { label, error, id, required, children, className, ...props },
  ref
) {
  const fieldId = id ?? props.name;
  const errorId = error && fieldId ? `${fieldId}-error` : undefined;
  return (
    <div className="space-y-1">
      <label htmlFor={fieldId} className="block text-sm font-medium text-navy">
        {label}
        {required ? <span className="text-red-700"> *</span> : null}
      </label>
      <select
        {...props}
        id={fieldId}
        ref={ref}
        aria-invalid={Boolean(error)}
        aria-required={required || undefined}
        aria-describedby={errorId}
        className={`min-h-11 w-full border bg-white px-3 py-2 text-sm ${error ? 'border-red-600' : 'border-slate-300'} focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy focus:ring-offset-1 ${className ?? ''}`}
      >
        {children}
      </select>
      {error ? (
        <p id={errorId} className="text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
});
