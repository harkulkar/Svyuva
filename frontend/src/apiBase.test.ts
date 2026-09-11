import { describe, expect, it } from 'vitest';
import { getApiBaseUrl } from './utils/apiBase';

describe('getApiBaseUrl', () => {
  it('returns a string (empty when Vite env is unset in unit tests)', () => {
    expect(typeof getApiBaseUrl()).toBe('string');
  });
});
