import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { AppError } from '../middleware/errorHandler.js';
import { AuditLog } from '../models/AuditLog.js';
import { Institute } from '../models/Institute.js';
import { RefreshToken } from '../models/RefreshToken.js';
import { University } from '../models/University.js';
import { User } from '../models/User.js';
import type { AuthUser } from '../types/auth.js';
import { writeAudit } from './auditService.js';
import { emailService } from './emailService.js';
import {
  createPasswordResetToken,
  createRefreshTokenValue,
  hashToken,
  parseDurationToMs,
  signAccessToken
} from '../utils/jwt.js';
import { comparePassword, hashPassword } from '../utils/password.js';
import type { LoginInput, SignupInput } from '../validators/authValidators.js';
import type { Request } from 'express';
import { collegeMayLoginForCorrection } from '../workflow/engine.js';

export function toAuthUser(user: {
  _id: mongoose.Types.ObjectId;
  name: string;
  email: string;
  role: AuthUser['role'];
  status: AuthUser['status'];
  phone?: string | null;
  instituteId?: mongoose.Types.ObjectId | null;
  universityId?: mongoose.Types.ObjectId | null;
  lastLoginAt?: Date | null;
  passwordResetRequired?: boolean;
}): AuthUser {
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    phone: user.phone || undefined,
    instituteId: user.instituteId ? String(user.instituteId) : undefined,
    universityId: user.universityId ? String(user.universityId) : undefined,
    lastLoginAt: user.lastLoginAt ? user.lastLoginAt.toISOString() : null,
    passwordResetRequired: Boolean((user as { passwordResetRequired?: boolean }).passwordResetRequired)
  };
}

export async function issueSession(
  userId: string,
  role: AuthUser['role'],
  persistent = false
): Promise<{
  accessToken: string;
  refreshToken: string;
  persistent: boolean;
}> {
  const accessToken = signAccessToken({ userId, role });
  const refreshToken = createRefreshTokenValue();
  await RefreshToken.create({
    userId,
    tokenHash: hashToken(refreshToken),
    expiresAt: new Date(Date.now() + parseDurationToMs(env.JWT_REFRESH_EXPIRES_IN)),
    persistent
  });
  return { accessToken, refreshToken, persistent };
}

export async function loginWithPassword(
  input: LoginInput,
  req: Request
): Promise<{ user: AuthUser; accessToken: string; refreshToken: string; persistent: boolean }> {
  const user = await User.findOne({ email: input.email.toLowerCase() }).select('+passwordHash');
  if (!user) {
    await writeAudit({ action: 'LOGIN_FAILED', req, metadata: { reason: 'unknown_or_invalid' } });
    throw new AppError('Invalid email or password.', 401, 'INVALID_CREDENTIALS');
  }

  const matches = await comparePassword(input.password, user.passwordHash);
  if (!matches) {
    if (user.passwordResetRequired) {
      await writeAudit({
        userId: String(user._id),
        action: 'LOGIN_FAILED',
        entityId: String(user._id),
        req,
        metadata: { reason: 'password_reset_required' }
      });
      throw new AppError('Password reset is required. Use Forgot password.', 403, 'PASSWORD_RESET_REQUIRED');
    }
    await writeAudit({
      userId: String(user._id),
      action: 'LOGIN_FAILED',
      entityId: String(user._id),
      req,
      metadata: { reason: 'invalid_password' }
    });
    throw new AppError('Invalid email or password.', 401, 'INVALID_CREDENTIALS');
  }

  if (user.status === 'PENDING') {
    const mayCorrect =
      user.role === 'COLLEGE' &&
      (await collegeMayLoginForCorrection(user.instituteId ? String(user.instituteId) : undefined));
    if (!mayCorrect) {
      throw new AppError('Your account is pending approval.', 403, 'ACCOUNT_PENDING');
    }
  } else if (user.status !== 'ACTIVE') {
    throw new AppError('Your account is inactive.', 403, 'ACCOUNT_INACTIVE');
  }

  user.lastLoginAt = new Date();
  await user.save();

  const session = await issueSession(String(user._id), user.role, Boolean(input.rememberMe));
  await writeAudit({
    userId: String(user._id),
    action: 'LOGIN_SUCCESS',
    entityId: String(user._id),
    req
  });

  return { user: toAuthUser(user), ...session };
}

export async function registerCollege(input: SignupInput, req: Request): Promise<AuthUser> {
  const email = input.email.toLowerCase();
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new AppError('An account with this email already exists.', 409, 'EMAIL_EXISTS');
  }
  const existingInstitute = await Institute.findOne({ email });
  if (existingInstitute) {
    throw new AppError('An account with this email already exists.', 409, 'EMAIL_EXISTS');
  }

  const university = await University.findOne({ _id: input.universityId, status: 'ACTIVE' });
  if (!university) {
    throw new AppError('Select a valid university.', 400, 'INVALID_UNIVERSITY');
  }

  const nameNormalized = input.instituteName.trim().toLowerCase();
  const duplicateName = await Institute.findOne({ universityId: university._id, nameNormalized });
  if (duplicateName) {
    throw new AppError('This institute is already registered with the selected university.', 409, 'INSTITUTE_EXISTS');
  }

  const code = generateInstituteCode(input.instituteName);
  let instituteId: mongoose.Types.ObjectId | undefined;

  const createPair = async (session: mongoose.ClientSession | null) => {
    const opts = session ? { session } : undefined;
    const [institute] = await Institute.create(
      [
        {
          universityId: university._id,
          name: input.instituteName,
          nameNormalized,
          code,
          exclusiveType: input.exclusiveType,
          locationType: input.locationType,
          minorityType: input.minorityType,
          linguisticType: input.linguisticType,
          address: input.address,
          district: input.district,
          taluka: input.taluka,
          jdRegion: input.jdRegion,
          email,
          mobile: input.mobile,
          contactNumber1: input.contactNumber1,
          contactNumber2: input.contactNumber2,
          principalName: input.principalName,
          collegeType: input.collegeType,
          status: 'PENDING'
        }
      ],
      opts
    );
    if (!institute) {
      throw new AppError('Unable to create institute registration.', 500, 'SIGNUP_FAILED');
    }
    const passwordHash = await hashPassword(input.password);
    const [user] = await User.create(
      [
        {
          name: input.principalName,
          email,
          passwordHash,
          role: 'COLLEGE',
          phone: input.mobile,
          status: 'PENDING',
          instituteId: institute._id,
          universityId: university._id
        }
      ],
      opts
    );
    if (!user) {
      throw new AppError('Unable to create user account.', 500, 'SIGNUP_FAILED');
    }
    return { institute, user };
  };

  try {
    let created: { institute: { _id: mongoose.Types.ObjectId }; user: { _id: mongoose.Types.ObjectId; name: string; email: string; role: AuthUser['role']; status: AuthUser['status']; phone?: string | null; instituteId?: mongoose.Types.ObjectId | null; universityId?: mongoose.Types.ObjectId | null } };
    const session = await mongoose.startSession();
    try {
      session.startTransaction();
      created = await createPair(session);
      await session.commitTransaction();
    } catch (error) {
      await session.abortTransaction().catch(() => undefined);
      const catalog =
        error instanceof Error && /catalog changes|Transaction numbers are only allowed/i.test(error.message);
      if (!catalog) throw error;
      created = await createPair(null);
    } finally {
      await session.endSession();
    }

    instituteId = created.institute._id;
    const { ensureWorkflowInstance } = await import('../workflow/engine.js');
    await ensureWorkflowInstance({
      workflowType: 'INSTITUTE_REGISTRATION',
      entityId: String(created.institute._id),
      instituteId: String(created.institute._id),
      universityId: String(university._id),
      initialState: 'PENDING'
    });
    await writeAudit({
      userId: String(created.user._id),
      action: 'COLLEGE_SIGNUP',
      entity: 'Institute',
      entityId: String(created.institute._id),
      req,
      metadata: { email }
    });
    return toAuthUser(created.user);
  } catch (error) {
    if (instituteId) {
      await Institute.deleteOne({ _id: instituteId }).catch(() => undefined);
    }
    if (error instanceof AppError) throw error;
    const duplicate = typeof error === 'object' && error && 'code' in error && (error as { code?: number }).code === 11000;
    if (duplicate) {
      throw new AppError('This institute is already registered.', 409, 'INSTITUTE_EXISTS');
    }
    throw error;
  }
}

function generateInstituteCode(name: string): string {
  const slug = name.replace(/[^a-zA-Z0-9]+/g, '').slice(0, 8).toUpperCase() || 'INST';
  return `SVY-${slug}-${Date.now().toString(36).toUpperCase()}`;
}

export async function logoutSession(refreshToken: string | undefined, req: Request, userId?: string): Promise<void> {
  if (refreshToken) {
    await RefreshToken.deleteOne({ tokenHash: hashToken(refreshToken) });
  }
  await writeAudit({
    userId: userId ?? null,
    action: 'LOGOUT',
    entityId: userId ?? null,
    req
  });
}

export async function refreshSession(refreshToken: string | undefined): Promise<{
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
  persistent: boolean;
}> {
  if (!refreshToken) {
    throw new AppError('Authentication required.', 401, 'UNAUTHORIZED');
  }
  const record = await RefreshToken.findOne({ tokenHash: hashToken(refreshToken) });
  if (!record || record.expiresAt.getTime() < Date.now()) {
    if (record) await RefreshToken.deleteOne({ _id: record._id });
    throw new AppError('Authentication required.', 401, 'UNAUTHORIZED');
  }

  const user = await User.findById(record.userId);
  if (!user || user.status !== 'ACTIVE') {
    await RefreshToken.deleteOne({ _id: record._id });
    throw new AppError('Authentication required.', 401, 'UNAUTHORIZED');
  }

  await RefreshToken.deleteOne({ _id: record._id });
  const session = await issueSession(String(user._id), user.role, Boolean(record.persistent));
  return { user: toAuthUser(user), ...session };
}

export async function requestPasswordReset(email: string, req: Request): Promise<void> {
  const user = await User.findOne({ email: email.toLowerCase() });
  await writeAudit({
    userId: user ? String(user._id) : null,
    action: 'PASSWORD_RESET_REQUEST',
    entityId: user ? String(user._id) : null,
    req,
    metadata: { requested: true }
  });

  if (!user || user.status === 'INACTIVE') {
    return;
  }

  const reset = createPasswordResetToken();
  user.passwordResetTokenHash = reset.tokenHash;
  user.passwordResetExpires = reset.expiresAt;
  await user.save();

  const resetUrl = `${env.CLIENT_URL}/reset-password/${reset.token}`;
  await emailService.sendPasswordResetEmail(user.email, resetUrl);
}

export async function resetPasswordWithToken(token: string, password: string, req: Request): Promise<void> {
  const tokenHash = hashToken(token);
  const user = await User.findOne({
    passwordResetTokenHash: tokenHash,
    passwordResetExpires: { $gt: new Date() }
  }).select('+passwordResetTokenHash +passwordResetExpires +passwordHash');

  if (!user) {
    throw new AppError('This reset link is invalid or has expired.', 400, 'INVALID_RESET_TOKEN');
  }

  user.passwordHash = await hashPassword(password);
  user.passwordResetTokenHash = null;
  user.passwordResetExpires = null;
  user.passwordResetRequired = false;
  user.passwordChangedAt = new Date();
  await user.save();
  await RefreshToken.deleteMany({ userId: user._id });

  await writeAudit({
    userId: String(user._id),
    action: 'PASSWORD_RESET_SUCCESS',
    entityId: String(user._id),
    req
  });
}

export async function listUniversities(): Promise<Array<{ id: string; name: string; code: string | null; shortName: string }>> {
  const rows = await University.find({ status: 'ACTIVE' }).sort({ name: 1 }).limit(500);
  return rows.map((row) => ({
    id: String(row._id),
    name: row.name,
    code: row.code || null,
    shortName: row.shortName || ''
  }));
}

export async function changePassword(userId: string, input: { currentPassword: string; newPassword: string }, req: Request) {
  const user = await User.findById(userId).select('+passwordHash');
  if (!user) {
    throw new AppError('Authentication required.', 401, 'UNAUTHORIZED');
  }
  const matches = await comparePassword(input.currentPassword, user.passwordHash);
  if (!matches) {
    throw new AppError('Current password is incorrect.', 400, 'INVALID_PASSWORD');
  }
  user.passwordHash = await hashPassword(input.newPassword);
  user.passwordResetRequired = false;
  user.passwordResetTokenHash = null;
  user.passwordResetExpires = null;
  user.passwordChangedAt = new Date();
  await user.save();
  await RefreshToken.deleteMany({ userId: user._id });
  const session = await issueSession(userId, user.role, false);
  await writeAudit({
    userId,
    action: 'PASSWORD_CHANGED',
    entity: 'User',
    entityId: userId,
    req
  });
  return session;
}

export { AuditLog };
