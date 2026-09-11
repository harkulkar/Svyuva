/** Documented viewport targets for Phase 14. Tailwind maps: sm 640, md 768, lg 1024, xl 1280, 2xl 1440. */
export const VIEWPORTS = [320, 375, 390, 414, 768, 1024, 1280, 1440] as const;

export const MQ = {
  mobile: '(max-width: 767px)',
  tablet: '(min-width: 768px) and (max-width: 1023px)',
  desktop: '(min-width: 1024px)',
  largeDesktop: '(min-width: 1440px)'
} as const;
