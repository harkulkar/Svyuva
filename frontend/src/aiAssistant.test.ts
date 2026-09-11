import { describe, expect, it } from 'vitest';
import { FOOTER_QUICK_LINKS } from './data/navigation';

describe('AI assistant entry points', () => {
  it('keeps the assistant in footer links without replacing primary navigation', () => {
    expect(FOOTER_QUICK_LINKS.some((item) => item.to === '/ai-assistant')).toBe(true);
  });
});
