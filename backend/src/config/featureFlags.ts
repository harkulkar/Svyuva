import { env } from './env.js';

export type FeatureFlagName =
  | 'insuranceHttpApi'
  | 'documentHttpApi'
  | 'paymentHttpApi'
  | 'reviewHttpApi'
  | 'ecardHttpApi';

export type FeatureFlags = Record<FeatureFlagName, boolean>;

export function getFeatureFlags(): FeatureFlags {
  return {
    insuranceHttpApi: env.FEATURE_INSURANCE_HTTP,
    documentHttpApi: env.FEATURE_DOCUMENT_HTTP,
    paymentHttpApi: env.FEATURE_PAYMENT_HTTP,
    reviewHttpApi: env.FEATURE_REVIEW_HTTP,
    ecardHttpApi: env.FEATURE_ECARD_HTTP
  };
}

export function featureFlagDocs(): Array<{ name: FeatureFlagName; env: string; enabled: boolean; defaultSafe: false }> {
  const flags = getFeatureFlags();
  return [
    { name: 'insuranceHttpApi', env: 'FEATURE_INSURANCE_HTTP', enabled: flags.insuranceHttpApi, defaultSafe: false },
    { name: 'documentHttpApi', env: 'FEATURE_DOCUMENT_HTTP', enabled: flags.documentHttpApi, defaultSafe: false },
    { name: 'paymentHttpApi', env: 'FEATURE_PAYMENT_HTTP', enabled: flags.paymentHttpApi, defaultSafe: false },
    { name: 'reviewHttpApi', env: 'FEATURE_REVIEW_HTTP', enabled: flags.reviewHttpApi, defaultSafe: false },
    { name: 'ecardHttpApi', env: 'FEATURE_ECARD_HTTP', enabled: flags.ecardHttpApi, defaultSafe: false }
  ];
}
