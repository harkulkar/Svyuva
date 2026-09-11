import { FileUpload, type UploadUiState } from './FileUpload';
import { validateExcelFile } from '../../utils/fileValidation';
import { formatFileSize } from '../../utils/fileValidation';

export function ExcelUpload({
  file,
  state,
  error,
  disabled,
  maxBytes,
  onSelect,
  onRemove
}: {
  file: File | null;
  state: UploadUiState;
  error?: string | null;
  disabled?: boolean;
  maxBytes: number;
  onSelect: (file: File | null) => void;
  onRemove: () => void;
}) {
  return (
    <div>
      <FileUpload
        label="Upload student Excel"
        accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        file={file}
        state={state}
        error={error}
        disabled={disabled}
        hint="Use the official template columns. Large files are validated on the server."
        onSelect={onSelect}
        onRemove={onRemove}
        validate={(selected) => validateExcelFile(selected, maxBytes)}
      />
      {file ? (
        <p className="mt-2 text-sm text-slate-600">
          {file.name} · {formatFileSize(file.size)} · Upload {state.toLowerCase()}
        </p>
      ) : null}
    </div>
  );
}
