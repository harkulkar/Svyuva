import '../config/dns.js';
import { env, isProduction } from '../config/env.js';
import { connectDatabase, disconnectDatabase } from '../config/db.js';
import { User } from '../models/User.js';
import { hashPassword, isStrongPassword } from '../utils/password.js';
import { logger } from '../utils/logger.js';

async function seedAdmin(): Promise<void> {
  if (isProduction && !env.ALLOW_ADMIN_SEED) {
    throw new Error('Admin seed refused in production. Set ALLOW_ADMIN_SEED=true only if explicitly required.');
  }
  if (!env.ALLOW_ADMIN_SEED) {
    throw new Error('Admin seed refused. Set ALLOW_ADMIN_SEED=true in the environment.');
  }

  const email = (env.SEED_ADMIN_EMAIL || env.ADMIN_EMAIL || '').toLowerCase();
  const password = env.SEED_ADMIN_PASSWORD || env.ADMIN_PASSWORD || '';
  const name = env.SEED_ADMIN_NAME || 'Portal Administrator';

  if (!email || !password) {
    throw new Error('SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD are required.');
  }
  if (!isStrongPassword(password)) {
    throw new Error('Admin password must be at least 8 characters and include uppercase, lowercase, and a number.');
  }

  await connectDatabase();
  const existing = await User.findOne({ email });
  if (existing) {
    existing.passwordHash = await hashPassword(password);
    existing.role = 'ADMIN';
    existing.status = 'ACTIVE';
    existing.instituteId = null;
    existing.universityId = null;
    await existing.save();
    logger.info('Admin user already exists; password and status updated');
    await disconnectDatabase();
    return;
  }

  await User.create({
    name,
    email,
    passwordHash: await hashPassword(password),
    role: 'ADMIN',
    status: 'ACTIVE',
    instituteId: null,
    universityId: null
  });
  logger.info('Admin user created');
  await disconnectDatabase();
}

seedAdmin().catch((error: unknown) => {
  logger.error('Admin seed failed', { message: error instanceof Error ? error.message : 'Unknown error' });
  process.exit(1);
});
