import { TEMPLATE_VARIABLES, type TemplateVariable } from './types.js';

const TOKEN = /\{\{\s*([a-zA-Z][a-zA-Z0-9_]*)\s*\}\}/g;
const ALLOWED = new Set<string>(TEMPLATE_VARIABLES);

export function allowedTemplateVariables(): TemplateVariable[] {
  return [...TEMPLATE_VARIABLES];
}

export function renderTemplate(source: string, vars: Record<string, string | number | undefined | null>): string {
  return source.replace(TOKEN, (_full, name: string) => {
    if (!ALLOWED.has(name)) return '';
    const value = vars[name];
    if (value == null) return '';
    return String(value).slice(0, 500);
  });
}

export function extractUnknownVariables(source: string): string[] {
  const unknown: string[] = [];
  for (const match of source.matchAll(TOKEN)) {
    const name = match[1];
    if (name && !ALLOWED.has(name) && !unknown.includes(name)) unknown.push(name);
  }
  return unknown;
}
