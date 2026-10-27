import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from 'node:crypto';

const VERSION = 'v1';
const MIN_KEY_LENGTH = 32;

function deriveKey(keyMaterial: string): Buffer {
  return Buffer.from(hkdfSync('sha256', keyMaterial, 'svysy-payment-secrets', 'aes-256-gcm', 32));
}

export function isEncryptionKeyUsable(keyMaterial: string): boolean {
  return keyMaterial.length >= MIN_KEY_LENGTH;
}

/** AES-256-GCM. Output: v1:<iv>:<tag>:<ciphertext> (base64url parts). */
export function encryptSecret(plain: string, keyMaterial: string): string {
  if (!isEncryptionKeyUsable(keyMaterial)) {
    throw new Error('Encryption key is not configured.');
  }
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', deriveKey(keyMaterial), iv);
  const body = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [VERSION, iv.toString('base64url'), tag.toString('base64url'), body.toString('base64url')].join(':');
}

export function decryptSecret(payload: string, keyMaterial: string): string {
  if (!isEncryptionKeyUsable(keyMaterial)) {
    throw new Error('Encryption key is not configured.');
  }
  const [version, iv, tag, body] = payload.split(':');
  if (version !== VERSION || !iv || !tag || !body) {
    throw new Error('Unsupported secret format.');
  }
  const decipher = createDecipheriv('aes-256-gcm', deriveKey(keyMaterial), Buffer.from(iv, 'base64url'));
  decipher.setAuthTag(Buffer.from(tag, 'base64url'));
  return Buffer.concat([decipher.update(Buffer.from(body, 'base64url')), decipher.final()]).toString('utf8');
}
