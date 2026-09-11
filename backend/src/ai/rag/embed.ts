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

export function distinctiveTokens(text: string): string[] {
  return tokenize(text).filter((token) => token.length > 3 && !STOP.has(token));
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
