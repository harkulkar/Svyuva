import { redactValue } from './sensitive.js';

export function migrationLog(entry: {
  entity: string;
  legacyId?: string | null;
  action: string;
  result: string;
  code?: string;
  message?: string;
}): void {
  const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);
  const parts = [
    `[${timestamp}]`,
    `ENTITY=${entry.entity}`,
    `LEGACY_ID=${entry.legacyId || '-'}`,
    `ACTION=${entry.action}`,
    `RESULT=${entry.result}`
  ];
  if (entry.code) parts.push(`CODE=${entry.code}`);
  if (entry.message) parts.push(`MESSAGE=${redactValue(entry.message)}`);
  console.info(parts.join(' '));
}
