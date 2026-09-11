import { describe, expect, it } from 'vitest';
import { ADMIN_LINKS, ADMIN_BOTTOM_NAV, COLLEGE_LINKS, COLLEGE_BOTTOM_NAV } from './data/portalNav';

describe('Phase 15 workflow UI', () => {
  it('includes the admin work queue in navigation', () => {
    expect(ADMIN_LINKS.some((item) => item.to === '/admin/work-queue')).toBe(true);
    expect(ADMIN_BOTTOM_NAV.some((item) => item.to === '/admin/work-queue')).toBe(true);
  });
});

describe('Phase 15 college submission UI', () => {
  it('includes college and admin submission routes in navigation', () => {
    expect(COLLEGE_LINKS.some((item) => item.to === '/college/submissions')).toBe(true);
    expect(COLLEGE_BOTTOM_NAV.some((item) => item.to === '/college/submissions')).toBe(true);
    expect(ADMIN_LINKS.some((item) => item.to === '/admin/submissions')).toBe(true);
    expect(ADMIN_BOTTOM_NAV.some((item) => item.to === '/admin/submissions')).toBe(true);
  });
});
