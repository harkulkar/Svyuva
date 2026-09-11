import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router-dom';
import { Seo } from '../../components/common/Seo';
import { ErrorMessage } from '../../components/common/ErrorMessage';
import { ButtonSpinner } from '../../components/common/Loading';
import { TextField } from '../../components/auth/FormField';
import { forgotPasswordRequest, getApiErrorMessage } from '../../services/api';

const schema = z.object({
  email: z.string().min(1, 'Email is required.').email('Enter a valid email address.')
});

export function ForgotPasswordPage() {
  const [success, setSuccess] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<{ email: string }>({ resolver: zodResolver(schema) });

  async function onSubmit(values: { email: string }) {
    setFormError(null);
    try {
      setSuccess(await forgotPasswordRequest(values.email));
    } catch (error) {
      setFormError(getApiErrorMessage(error));
    }
  }

  return (
    <>
      <Seo title="Forgot password" path="/forgot-password" />
      <main id="main-content" className="mx-auto w-full max-w-md px-4 py-12">
        <div className="border border-slate-300 bg-white p-6 shadow-sm">
          <h1 className="text-xl font-semibold text-navy">Forgot password</h1>
          <p className="mt-2 text-sm text-slate-700">Enter the email used for your college or administrator account.</p>
          {formError ? <div className="mt-4"><ErrorMessage message={formError} /></div> : null}
          {success ? (
            <p className="mt-4 rounded border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900" role="status">
              {success}
            </p>
          ) : (
            <form className="mt-4 space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
              <TextField label="Email" type="email" autoComplete="email" error={errors.email?.message} {...register('email')} />
              <button
                type="submit"
                disabled={isSubmitting}
                aria-busy={isSubmitting}
                className="inline-flex w-full items-center justify-center gap-2 bg-navy py-2.5 text-sm font-semibold text-white disabled:opacity-60"
              >
                {isSubmitting ? <ButtonSpinner /> : null}
                {isSubmitting ? 'Submitting…' : 'Send reset link'}
              </button>
            </form>
          )}
          <p className="mt-4 text-sm">
            <Link to="/login" className="text-navy underline">
              Back to login
            </Link>
          </p>
        </div>
      </main>
    </>
  );
}
