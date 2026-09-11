export type TextChunk = {
  text: string;
  section: string;
  page: number | null;
};

export function chunkText(raw: string, maxChars = 900): TextChunk[] {
  const cleaned = raw.replace(/\r\n/g, '\n').replace(/\t/g, ' ').trim();
  if (!cleaned) return [];
  const blocks = cleaned.split(/\n{2,}/).map((block) => block.trim()).filter(Boolean);
  const chunks: TextChunk[] = [];
  let current = '';
  let section = '';
  let page: number | null = null;

  function flush(): void {
    const text = current.trim();
    if (text) chunks.push({ text, section, page });
    current = '';
  }

  for (const block of blocks) {
    const pageMatch = block.match(/^\[\[page\s+(\d+)\]\]$/i);
    if (pageMatch) {
      flush();
      page = Number(pageMatch[1]);
      continue;
    }
    if (block.length < 120 && /[A-Za-z\u0900-\u097F]/.test(block) && !block.endsWith('.')) {
      flush();
      section = block.slice(0, 160);
    }
    if (`${current}\n\n${block}`.length > maxChars) {
      flush();
    }
    current = current ? `${current}\n\n${block}` : block;
  }
  flush();
  return chunks;
}
