import { useEffect, useId, useState } from 'react';
import { formatFileSize, isImageFile, isPdfFile, type ClientFileCheck } from '../../utils/fileValidation';
import { ButtonSpinner } from './Loading';

export type UploadUiState = 'IDLE' | 'SELECTED' | 'VALIDATING' | 'UPLOADING' | 'PROCESSING' | 'SUCCESS' | 'FAILED';

export function FileUpload({
  id,
  label,
  accept,
  capture,
  hint,
  file,
  state,
  progress,
  message,
  error,
  disabled,
  onSelect,
  onRemove,
  onRetry,
  onCancel,
  validate
}: {
  id?: string;
  label: string;
  accept: string;
  capture?: 'environment' | 'user';
  hint?: string;
  file: File | null;
  state: UploadUiState;
  progress?: number;
  message?: string;
  error?: string | null;
  disabled?: boolean;
  onSelect: (file: File | null) => void;
  onRemove: () => void;
  onRetry?: () => void;
  onCancel?: () => void;
  validate?: (file: File) => ClientFileCheck;
}) {
  const inputId = useId();
  const fieldId = id ?? inputId;
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!file || !isImageFile(file)) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function pick(next: File | null) {
    if (!next) {
      onSelect(null);
      return;
    }
    if (validate) {
      const result = validate(next);
      if (!result.ok) {
        onSelect(next);
        return;
      }
    }
    onSelect(next);
  }

  const busy = state === 'VALIDATING' || state === 'UPLOADING' || state === 'PROCESSING';

  return (
    <div className="space-y-3">
      <label htmlFor={fieldId} className="block text-sm font-medium text-navy">
        {label}
      </label>
      <input
        id={fieldId}
        type="file"
        accept={accept}
        capture={capture}
        disabled={disabled || busy}
        className="block w-full text-sm file:mr-3 file:min-h-11 file:border file:border-navy file:bg-white file:px-3 file:py-2 file:text-sm file:font-semibold file:text-navy"
        onChange={(event) => pick(event.target.files?.[0] ?? null)}
      />
      {hint ? <p className="text-xs text-slate-600">{hint}</p> : null}
      {file ? (
        <div className="border border-slate-300 bg-slate-50 p-3 text-sm">
          <p className="font-medium text-navy">{file.name}</p>
          <p className="mt-1 text-slate-600">
            {file.type || 'Unknown type'} · {formatFileSize(file.size)}
          </p>
          {previewUrl ? <img src={previewUrl} alt="Selected file preview" className="mt-3 max-h-48 w-auto" /> : null}
          {isPdfFile(file) ? <p className="mt-2 text-xs text-slate-600">PDF selected. Preview opens after a successful authorised download.</p> : null}
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" className="min-h-11 border border-slate-400 px-3 py-1 text-sm" onClick={onRemove} disabled={busy}>
              Remove
            </button>
            {state === 'FAILED' && onRetry ? (
              <button type="button" className="min-h-11 bg-navy px-3 py-1 text-sm font-semibold text-white" onClick={onRetry}>
                Retry
              </button>
            ) : null}
            {busy && onCancel ? (
              <button type="button" className="min-h-11 border border-navy px-3 py-1 text-sm text-navy" onClick={onCancel}>
                Cancel
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
      {busy ? (
        <p className="inline-flex items-center gap-2 text-sm text-navy" role="status">
          <ButtonSpinner />
          {state === 'VALIDATING' ? 'Validating…' : state === 'UPLOADING' ? 'Uploading…' : 'Processing…'}
          {typeof progress === 'number' ? ` ${Math.round(progress)}%` : ''}
        </p>
      ) : null}
      {state === 'SUCCESS' && message ? (
        <p className="text-sm text-green-800" role="status">
          {message}
        </p>
      ) : null}
      {state === 'FAILED' && (error || message) ? (
        <p className="text-sm text-red-800" role="alert">
          {error || message}
        </p>
      ) : null}
    </div>
  );
}
