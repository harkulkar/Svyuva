import type { Request } from 'express';
import { env } from '../config/env.js';
import { AppError } from '../middleware/errorHandler.js';
import { SystemSetting } from '../models/SystemSetting.js';
import { User } from '../models/User.js';
import { writeAudit } from '../services/auditService.js';
import type { AuthUser } from '../types/auth.js';
import { comparePassword } from '../utils/password.js';
import { logger } from '../utils/logger.js';
import { decryptSecret, encryptSecret, isEncryptionKeyUsable } from './secretBox.js';
import { pingRazorpay } from './razorpayClient.js';

const SETTING_KEY = 'payment.razorpay';

export type GatewayMode = 'test' | 'live';

type StoredGatewayConfig = {
  keyId: string;
  keySecretEnc: string;
  webhookSecretEnc: string | null;
  mid: string | null;
  pfMid: string | null;
  enabled: boolean;
};

export type GatewayConfig = {
  source: 'database' | 'environment';
  keyId: string;
  keySecret: string;
  webhookSecret: string | null;
  mode: GatewayMode;
  mid: string | null;
  pfMid: string | null;
  enabled: boolean;
};

export function gatewayModeOf(keyId: string): GatewayMode {
  return keyId.startsWith('rzp_live_') ? 'live' : 'test';
}

async function readStored() {
  const row = await SystemSetting.findOne({ key: SETTING_KEY }).lean();
  if (!row || !row.value || typeof row.value !== 'object') return null;
  return { stored: row.value as StoredGatewayConfig, updatedAt: row.updatedAt ?? null };
}

function fromEnvironment(): GatewayConfig | null {
  if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) return null;
  return {
    source: 'environment',
    keyId: env.RAZORPAY_KEY_ID,
    keySecret: env.RAZORPAY_KEY_SECRET,
    webhookSecret: env.RAZORPAY_WEBHOOK_SECRET || null,
    mode: gatewayModeOf(env.RAZORPAY_KEY_ID),
    mid: null,
    pfMid: null,
    enabled: env.FEATURE_PAYMENT_HTTP
  };
}

/** Credentials saved by an administrator win; environment variables are a fallback. */
export async function loadGatewayConfig(): Promise<GatewayConfig | null> {
  const found = await readStored();
  if (found) {
    try {
      const { stored } = found;
      return {
        source: 'database',
        keyId: stored.keyId,
        keySecret: decryptSecret(stored.keySecretEnc, env.PAYMENT_ENCRYPTION_KEY),
        webhookSecret: stored.webhookSecretEnc ? decryptSecret(stored.webhookSecretEnc, env.PAYMENT_ENCRYPTION_KEY) : null,
        mode: gatewayModeOf(stored.keyId),
        mid: stored.mid ?? null,
        pfMid: stored.pfMid ?? null,
        enabled: Boolean(stored.enabled)
      };
    } catch {
      logger.error('payment_gateway_decrypt_failed', {});
      return null;
    }
  }
  return fromEnvironment();
}

export async function requireGatewayConfig(): Promise<GatewayConfig> {
  const config = await loadGatewayConfig();
  if (!config || !config.enabled) {
    throw new AppError('Online payment is not available right now.', 503, 'PAYMENT_UNAVAILABLE');
  }
  return config;
}

/** Whether colleges must pay online before importing students. */
export async function isOnlinePaymentEnabled(): Promise<boolean> {
  const config = await loadGatewayConfig();
  return Boolean(config?.enabled);
}

export async function getPaymentAvailability() {
  const config = await loadGatewayConfig();
  return { enabled: Boolean(config?.enabled), mode: config?.enabled ? config.mode : null };
}

function webhookUrlFor(req?: Request): string | null {
  const base = env.NODE_ENV === 'production' || !req ? process.env.BACKEND_URL : `${req.protocol}://${req.get('host')}`;
  const origin = base || (req ? `${req.protocol}://${req.get('host')}` : '');
  return origin ? `${origin.replace(/\/$/, '')}/api/payments/razorpay/webhook` : null;
}

export async function getGatewayAdminView(req?: Request) {
  const found = await readStored();
  const config = await loadGatewayConfig();
  const stored = found?.stored;
  return {
    provider: 'razorpay' as const,
    source: config?.source ?? (found ? ('database' as const) : ('none' as const)),
    configured: Boolean(config),
    enabled: Boolean(config?.enabled),
    keyId: config?.keyId ?? stored?.keyId ?? '',
    keySecretSet: Boolean(config?.keySecret),
    webhookSecretSet: Boolean(config?.webhookSecret),
    mode: config?.mode ?? null,
    mid: config?.mid ?? stored?.mid ?? '',
    pfMid: config?.pfMid ?? stored?.pfMid ?? '',
    webhookUrl: webhookUrlFor(req),
    encryptionKeyConfigured: isEncryptionKeyUsable(env.PAYMENT_ENCRYPTION_KEY),
    credentialsUnreadable: Boolean(found) && !config,
    updatedAt: found?.updatedAt ? new Date(found.updatedAt).toISOString() : null
  };
}

export type GatewayConfigInput = {
  keyId: string;
  keySecret?: string;
  webhookSecret?: string;
  mid?: string;
  pfMid?: string;
  enabled: boolean;
  currentPassword: string;
};

async function assertAdminPassword(admin: AuthUser, password: string): Promise<void> {
  const user = await User.findById(admin.id).select('+passwordHash');
  if (!user || !(await comparePassword(password, user.passwordHash))) {
    throw new AppError('Your password is incorrect.', 400, 'INVALID_PASSWORD');
  }
}

function requireEncryptionKey(): void {
  if (!isEncryptionKeyUsable(env.PAYMENT_ENCRYPTION_KEY)) {
    throw new AppError(
      'PAYMENT_ENCRYPTION_KEY (at least 32 characters) must be set on the server before credentials can be saved.',
      503,
      'ENCRYPTION_NOT_CONFIGURED'
    );
  }
}

export async function saveGatewayConfig(input: GatewayConfigInput, admin: AuthUser, req: Request) {
  await assertAdminPassword(admin, input.currentPassword);
  requireEncryptionKey();

  const existing = (await readStored())?.stored ?? null;
  let existingReadable = Boolean(existing);
  if (existing) {
    try {
      decryptSecret(existing.keySecretEnc, env.PAYMENT_ENCRYPTION_KEY);
    } catch {
      existingReadable = false;
    }
  }
  const keyChanged = !existing || !existingReadable || existing.keyId !== input.keyId;
  const newSecret = input.keySecret?.trim() || '';
  if (keyChanged && !newSecret) {
    throw new AppError('Enter the Key Secret that belongs to this Key ID.', 400, 'VALIDATION_ERROR');
  }

  if (newSecret) {
    await pingRazorpay({ keyId: input.keyId, keySecret: newSecret });
  }

  const newWebhookSecret = input.webhookSecret?.trim() || '';
  const next: StoredGatewayConfig = {
    keyId: input.keyId,
    keySecretEnc: newSecret ? encryptSecret(newSecret, env.PAYMENT_ENCRYPTION_KEY) : existing!.keySecretEnc,
    webhookSecretEnc: newWebhookSecret
      ? encryptSecret(newWebhookSecret, env.PAYMENT_ENCRYPTION_KEY)
      : keyChanged
        ? null
        : existing?.webhookSecretEnc ?? null,
    mid: input.mid?.trim() || null,
    pfMid: input.pfMid?.trim() || null,
    enabled: input.enabled
  };

  await SystemSetting.updateOne({ key: SETTING_KEY }, { $set: { key: SETTING_KEY, value: next, updatedBy: admin.id } }, { upsert: true });
  await writeAudit({
    userId: admin.id,
    action: 'PAYMENT_GATEWAY_CONFIG_UPDATED',
    entity: 'Setting',
    req,
    metadata: {
      provider: 'razorpay',
      keyId: next.keyId,
      mode: gatewayModeOf(next.keyId),
      enabled: next.enabled,
      keySecretChanged: Boolean(newSecret),
      webhookSecretChanged: Boolean(newWebhookSecret),
      mid: next.mid,
      pfMid: next.pfMid
    }
  });
  return getGatewayAdminView(req);
}

export async function clearGatewayConfig(admin: AuthUser, currentPassword: string, req: Request) {
  await assertAdminPassword(admin, currentPassword);
  await SystemSetting.deleteOne({ key: SETTING_KEY });
  await writeAudit({ userId: admin.id, action: 'PAYMENT_GATEWAY_CONFIG_CLEARED', entity: 'Setting', req, metadata: { provider: 'razorpay' } });
  return getGatewayAdminView(req);
}

export async function testGatewayConnection(admin: AuthUser, req: Request) {
  const config = await loadGatewayConfig();
  if (!config) {
    throw new AppError('Save a Key ID and Key Secret first.', 400, 'GATEWAY_NOT_CONFIGURED');
  }
  await pingRazorpay({ keyId: config.keyId, keySecret: config.keySecret });
  await writeAudit({
    userId: admin.id,
    action: 'PAYMENT_GATEWAY_CONNECTION_TESTED',
    entity: 'Setting',
    req,
    metadata: { provider: 'razorpay', keyId: config.keyId, mode: config.mode }
  });
  return { ok: true, mode: config.mode, message: `Connected to Razorpay in ${config.mode} mode.` };
}
