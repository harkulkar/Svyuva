import * as XLSX from 'xlsx';
import type { OcrStatus } from '../ai.types.js';
import { env } from '../../config/env.js';

export type ExtractionResult = {
  text: string;
  ocrStatus: OcrStatus;
  ocrConfidence: number | null;
};

function extractPdfText(buffer: Buffer): string {
  const raw = buffer.toString('latin1');
  const matches = [...raw.matchAll(/\((?:\\.|[^\\)]){4,}\)/g)].map((item) =>
    item[0].slice(1, -1).replace(/\\n/g, '\n').replace(/\\[()]/g, '')
  );
  const text = matches.filter((line) => /[A-Za-z\u0900-\u097F]/.test(line)).join('\n');
  return text.slice(0, 200000);
}

function extractDocxText(buffer: Buffer): string {
  const raw = buffer.toString('utf8');
  const parts = [...raw.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)].map((item) => item[1]);
  return parts.join(' ').replace(/\s+/g, ' ').trim();
}

export async function extractDocumentText(buffer: Buffer, filename: string, mimeType: string): Promise<ExtractionResult> {
  const name = filename.toLowerCase();
  if (name.endsWith('.txt') || mimeType.startsWith('text/')) {
    return { text: buffer.toString('utf8'), ocrStatus: 'NOT_REQUIRED', ocrConfidence: null };
  }
  if (name.endsWith('.csv')) {
    return { text: buffer.toString('utf8'), ocrStatus: 'NOT_REQUIRED', ocrConfidence: null };
  }
  if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheets = workbook.SheetNames.map((sheet) => XLSX.utils.sheet_to_csv(workbook.Sheets[sheet]!));
    return { text: sheets.join('\n'), ocrStatus: 'NOT_REQUIRED', ocrConfidence: null };
  }
  if (name.endsWith('.docx') || name.endsWith('.doc')) {
    const text = extractDocxText(buffer);
    return {
      text,
      ocrStatus: text ? 'NOT_REQUIRED' : 'OCR_REVIEW_REQUIRED',
      ocrConfidence: null
    };
  }
  if (name.endsWith('.pdf')) {
    const text = extractPdfText(buffer);
    return {
      text,
      ocrStatus: text.length > 40 ? 'NOT_REQUIRED' : 'OCR_REVIEW_REQUIRED',
      ocrConfidence: null
    };
  }
  if (name.endsWith('.jpg') || name.endsWith('.jpeg') || name.endsWith('.png')) {
    void env.AI_OCR_ENGINE;
    return { text: '', ocrStatus: 'OCR_REVIEW_REQUIRED', ocrConfidence: null };
  }
  return { text: '', ocrStatus: 'OCR_REVIEW_REQUIRED', ocrConfidence: null };
}

export function extractVisibleFields(text: string): {
  emails: string[];
  mobiles: string[];
  note: string;
} {
  const emails = [...new Set([...text.matchAll(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi)].map((item) => item[0]))];
  const mobiles = [...new Set([...text.matchAll(/\b[6-9]\d{9}\b/g)].map((item) => item[0]))];
  return {
    emails: emails.slice(0, 20),
    mobiles: mobiles.slice(0, 20),
    note: 'Only values that appear in the supplied text. Not verified official data. Confirm before use.'
  };
}
