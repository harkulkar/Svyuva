import { describe, expect, it } from 'vitest';
import { POLICIES, INSURERS } from './components/college/InsurerPremiumStep';

describe('college insurer policy options', () => {
  it('lists National and ICICI, with GMC only on ICICI', () => {
    expect(INSURERS.map((item) => item.code)).toEqual(['NATIONAL', 'ICICI']);
    expect(POLICIES.NATIONAL.map((item) => item.type)).toEqual(['GPA']);
    expect(POLICIES.ICICI.map((item) => item.type)).toEqual(['GPA', 'GMC']);
  });
});
