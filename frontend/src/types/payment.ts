export type PaymentGatewayAdminView = {
  provider: 'razorpay';
  source: 'database' | 'environment' | 'none';
  configured: boolean;
  enabled: boolean;
  keyId: string;
  keySecretSet: boolean;
  webhookSecretSet: boolean;
  mode: 'test' | 'live' | null;
  mid: string;
  pfMid: string;
  webhookUrl: string | null;
  encryptionKeyConfigured: boolean;
  credentialsUnreadable: boolean;
  updatedAt: string | null;
};

export type PaymentGatewaySaveInput = {
  keyId: string;
  keySecret?: string;
  webhookSecret?: string;
  mid?: string;
  pfMid?: string;
  enabled: boolean;
  currentPassword: string;
};

export type PaymentAvailability = { enabled: boolean; mode: 'test' | 'live' | null };

export type PaymentRecord = {
  id: string;
  status: string;
  amount: number | null;
  amountPaise: number | null;
  currency: string;
  orderId: string | null;
  paymentId: string | null;
  method: string | null;
  paidAt: string | null;
  failureReason: string | null;
  uploadJobId: string | null;
};

export type CheckoutOrder = {
  payment: PaymentRecord;
  checkout: {
    keyId: string;
    orderId: string;
    amountPaise: number;
    currency: string;
    mode: 'test' | 'live';
    name: string;
    description: string;
    prefill: { name: string; email: string; contact: string };
  };
};

export type CheckoutSuccess = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};
