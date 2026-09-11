import { describe, expect, it } from 'vitest';
import { validateDocumentFile, validateExcelFile, formatFileSize } from './utils/fileValidation';
import { shouldServiceWorkerHandle } from './pwa/cachePolicy';
import { VIEWPORTS } from './utils/breakpoints';

function fakeFile(name: string, type: string, size: number): File {
  const blob = new Blob([new Uint8Array(size)], { type });
  return new File([blob], name, { type });
}

describe('Phase 14 file validation', () => {
  it('accepts a small Excel workbook', () => {
    expect(validateExcelFile(fakeFile('students.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 1024), 5 * 1024 * 1024).ok).toBe(true);
  });

  it('rejects a non-Excel file and oversized Excel', () => {
    expect(validateExcelFile(fakeFile('notes.pdf', 'application/pdf', 1024), 5 * 1024 * 1024).ok).toBe(false);
    expect(validateExcelFile(fakeFile('students.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 6 * 1024 * 1024), 5 * 1024 * 1024).ok).toBe(false);
  });

  it('accepts PDF and camera images and rejects other types', () => {
    expect(validateDocumentFile(fakeFile('id.pdf', 'application/pdf', 2048), 8 * 1024 * 1024).ok).toBe(true);
    expect(validateDocumentFile(fakeFile('photo.jpg', 'image/jpeg', 2048), 8 * 1024 * 1024).ok).toBe(true);
    expect(validateDocumentFile(fakeFile('script.exe', 'application/octet-stream', 2048), 8 * 1024 * 1024).ok).toBe(false);
  });

  it('formats file sizes for the upload preview', () => {
    expect(formatFileSize(512)).toBe('512 B');
    expect(formatFileSize(2048)).toContain('KB');
  });
});

describe('Phase 14 PWA cache policy', () => {
  it('never lets the service worker handle /api/ requests', () => {
    expect(shouldServiceWorkerHandle('https://svyuvasuraksha.org/api/college/students')).toBe(false);
    expect(shouldServiceWorkerHandle('https://svyuvasuraksha.org/api/admin/institutes')).toBe(false);
    expect(shouldServiceWorkerHandle('/api/auth/me')).toBe(false);
  });

  it('allows shell and static paths', () => {
    expect(shouldServiceWorkerHandle('https://svyuvasuraksha.org/offline.html')).toBe(true);
    expect(shouldServiceWorkerHandle('https://svyuvasuraksha.org/manifest.webmanifest')).toBe(true);
  });
});

describe('Phase 14 viewports', () => {
  it('includes the required mobile through large-desktop widths', () => {
    expect([...VIEWPORTS]).toEqual([320, 375, 390, 414, 768, 1024, 1280, 1440]);
  });
});
