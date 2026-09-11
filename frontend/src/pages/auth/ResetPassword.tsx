import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useParams } from 'react-router-dom';
import { Seo } from '../../components/common/Seo';
import { ErrorMessage } from '../../components/common/ErrorMessage';
import { ButtonSpinner } from '../../components/common/Loading';
import { TextField } from '../../components/auth/FormField';
import { getApiErrorMessage, resetPasswordRequest } from '../../services/api';

const schema = z
  .object({
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters.')
      .regex(/[A-Z]/, 'Include an uppercase letter.')
      .regex(/[a-z]/, 'Include a lowercase letter.')
      .regex(/\d/, 'Include a number.'),
    confirmPassword: z.string().min(1, 'Confirm password is required.')
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword']
  });

export function ResetPasswordPage() {
  const { token } = useParams();
  const [success, setSuccess] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<{ password: string; confirmPassword: string }>({ resolver: zodResolver(schema) });

  async function onSubmit(values: { password: string; confirmPassword: string }) {
    if (!token) {
      setFormError('This reset link is invalid or has expired.');
      return;
    }
    setFormError(null);
    try {
      setSuccess(await resetPasswordRequest(token, values.password, values.confirmPassword));
    } catch (error) {
      setFormError(getApiErrorMessage(error, 'This reset link is invalid or has expired.'));
    }
  }

  return (
    <>
      <Seo title="Reset password" path="/reset-password" />
      <main id="main-content" className="mx-auto w-full max-w-md px-4 py-12">
        <div className="border border-slate-300 bg-white p-6 shadow-sm">
          <h1 className="text-xl font-semibold text-navy">Reset password</h1>
          {formError ? <div className="mt-4"><ErrorMessage message={formError} /></div> : null}
          {success ? (
            <p className="mt-4 text-sm text-green-900" role="status">
              {success}{' '}
              <Link to="/login" className="font-semibold underline">
                Login
              </Link>
            </p>
          ) : (
            <form className="mt-4 space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
              <TextField label="New password" type="password" autoComplete="new-password" error={errors.password?.message} {...register('password')} />
              <TextField
                label="Confirm password"
                type="password"
                autoComplete="new-password"
                error={errors.confirmPassword?.message}
                {...register('confirmPassword')}
              />
              <button
                type="submit"
                disabled={isSubmitting}
                aria-busy={isSubmitting}
                className="inline-flex w-full items-center justify-center gap-2 bg-navy py-2.5 text-sm font-semibold text-white disabled:opacity-60"
              >
                {isSubmitting ? <ButtonSpinner /> : null}
                {isSubmitting ? 'Updating…' : 'Update password'}
              </button>
            </form>
          )}
        </div>
      </main>
    </>
  );
}
