import mongoose from 'mongoose';

export async function withOptionalTransaction<T>(
  fn: (session: mongoose.ClientSession | null) => Promise<T>
): Promise<T> {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();
    const result = await fn(session);
    await session.commitTransaction();
    return result;
  } catch (error) {
    await session.abortTransaction().catch(() => undefined);
    const unsupported =
      error instanceof Error && /Transaction numbers are only allowed|catalog changes/i.test(error.message);
    if (!unsupported) throw error;
    return fn(null);
  } finally {
    await session.endSession();
  }
}
