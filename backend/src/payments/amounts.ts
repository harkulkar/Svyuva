import { computeInsurerPremium } from '../data/insurerPremiumCatalog.js';

export function rupeesToPaise(rupees: number): number {
  return Math.round(rupees * 100);
}

/** The amount a job must pay, always derived server-side from stored job data. */
export function expectedJobAmountPaise(job: { insurer?: string | null; policyType?: string | null; validCount: number }) {
  if (!job.insurer || !job.policyType) return null;
  const quote = computeInsurerPremium({ insurer: job.insurer, policyType: job.policyType, studentCount: job.validCount });
  return quote ? { quote, amountPaise: rupeesToPaise(quote.totalPremium) } : null;
}
