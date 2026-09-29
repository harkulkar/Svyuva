const DIM = 128;

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]+/gu, ' ')
    .split(/\s+/)
    .filter((token) => token.length > 1);
}

const STOP = new Set([
  'the',
  'and',
  'for',
  'this',
  'that',
  'from',
  'with',
  'what',
  'who',
  'how',
  'many',
  'are',
  'is',
  'was',
  'were',
  'official',
  'scheme',
  'portal',
  'please',
  'about'
]);

const ACRONYMS = new Set(['gpa', 'gic', 'pdf', 'gr', 'pa']);

export function distinctiveTokens(text: string): string[] {
  return tokenize(text).filter((token) => {
    if (STOP.has(token)) return false;
    if (ACRONYMS.has(token)) return true;
    return token.length > 3;
  });
}

export function expandQuestion(question: string): string {
  let extra = '';
  if (/\bgpa\b/i.test(question)) extra += ' group personal accident personal accident policy GPA claim';
  if (/\bpersonal\s+accident\b/i.test(question) || /\bpa\b/i.test(question)) {
    extra += ' GPA group personal accident personal accident policy';
  }
  if (/\bmediclaim\b/i.test(question)) extra += ' health coverage hospitalization mediclaim policy';
  if (/\bpolic(y|ies)\b/i.test(question) || /poliucy/i.test(question)) extra += ' policy details';
  return `${question}${extra}`.trim();
}

export function levenshtein(a: string, b: string, max = 2): number {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const rows = a.length + 1;
  const cols = b.length + 1;
  const prev = new Array<number>(cols);
  const next = new Array<number>(cols);
  for (let j = 0; j < cols; j += 1) prev[j] = j;
  for (let i = 1; i < rows; i += 1) {
    next[0] = i;
    let rowMin = next[0];
    for (let j = 1; j < cols; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      next[j] = Math.min((prev[j] ?? 0) + 1, (next[j - 1] ?? 0) + 1, (prev[j - 1] ?? 0) + cost);
      rowMin = Math.min(rowMin, next[j] ?? max + 1);
    }
    if (rowMin > max) return max + 1;
    for (let j = 0; j < cols; j += 1) prev[j] = next[j] ?? 0;
  }
  return prev[b.length] ?? max + 1;
}

export function tokenOverlap(needed: string[], haystack: string): number {
  const tokens = new Set(tokenize(haystack));
  let hits = 0;
  for (const token of needed) {
    if (tokens.has(token)) {
      hits += 1;
      continue;
    }
    if (token.length < 6) continue;
    for (const other of tokens) {
      if (Math.abs(other.length - token.length) > 2) continue;
      if (levenshtein(token, other, 2) <= 2) {
        hits += 1;
        break;
      }
    }
  }
  return hits;
}

function hashToken(token: string): number {
  let h = 2166136261;
  for (let i = 0; i < token.length; i += 1) {
    h ^= token.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h) % DIM;
}

export function embedText(text: string): number[] {
  const vector = new Array<number>(DIM).fill(0);
  const tokens = tokenize(text);
  for (const token of tokens) {
    const index = hashToken(token);
    vector[index] = (vector[index] ?? 0) + 1;
  }
  const norm = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0)) || 1;
  return vector.map((value) => value / norm);
}

export function cosineSimilarity(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length);
  let sum = 0;
  for (let i = 0; i < n; i += 1) {
    sum += (a[i] ?? 0) * (b[i] ?? 0);
  }
  return sum;
}

export function detectLanguage(text: string): 'en' | 'hi' | 'mr' {
  if (!/[\u0900-\u097F]/.test(text)) return 'en';
  const marathiHints = /आहे|कसे|काय|कृपया|महाविद्यालय|विद्यार्थी/;
  return marathiHints.test(text) ? 'mr' : 'hi';
}
