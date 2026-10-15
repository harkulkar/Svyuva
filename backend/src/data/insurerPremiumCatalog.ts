export const GST_RATE = 0.18;

export const INSURER_CODES = ['NATIONAL', 'ICICI'] as const;
export type InsurerCode = (typeof INSURER_CODES)[number];

export const POLICY_TYPES = ['GPA', 'GMC'] as const;
export type PolicyType = (typeof POLICY_TYPES)[number];

export const INSURERS = [
  {
    code: 'NATIONAL' as const,
    name: 'National Insurance Co. Ltd.',
    policies: [
      { type: 'GPA' as const, label: 'Group personal accident (GPA)', ratePerStudent: 62 }
    ]
  },
  {
    code: 'ICICI' as const,
    name: 'ICICI Lombard General Insurance Co. Ltd.',
    policies: [
      { type: 'GPA' as const, label: 'Group personal accident (GPA)', ratePerStudent: 20 },
      { type: 'GMC' as const, label: 'Group Mediclaim (GMC)', ratePerStudent: 422 }
    ]
  }
];

export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export function findInsurerPolicy(insurer: string, policyType: string) {
  const company = INSURERS.find((item) => item.code === insurer);
  if (!company) return null;
  return company.policies.find((item) => item.type === policyType) ?? null;
}

export function insurerPremiumOptions() {
  return {
    gstRate: GST_RATE,
    currency: 'INR',
    insurers: INSURERS.map((item) => ({
      code: item.code,
      name: item.name,
      policies: item.policies.map((policy) => ({ type: policy.type, label: policy.label }))
    }))
  };
}

export function computeInsurerPremium(input: {
  insurer: string;
  policyType: string;
  studentCount: number;
}) {
  const policy = findInsurerPolicy(input.insurer, input.policyType);
  if (!policy) {
    return null;
  }
  const studentCount = Math.max(0, Math.floor(input.studentCount));
  const ratePerStudent = policy.ratePerStudent;
  const basePremium = roundMoney(studentCount * ratePerStudent);
  const gstAmount = roundMoney(basePremium * GST_RATE);
  const totalPremium = roundMoney(basePremium + gstAmount);
  const company = INSURERS.find((item) => item.code === input.insurer);
  return {
    insurer: input.insurer,
    insurerName: company?.name || input.insurer,
    policyType: input.policyType,
    policyLabel: policy.label,
    studentCount,
    ratePerStudent,
    gstRate: GST_RATE,
    basePremium,
    gstAmount,
    totalPremium,
    currency: 'INR',
    formula: `(${studentCount} × ₹${ratePerStudent}) + ${Math.round(GST_RATE * 100)}% GST`
  };
}
