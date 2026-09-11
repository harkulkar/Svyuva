import { useState } from 'react';
import type { FormEvent } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from 'react-router-dom';
import { Seo } from '../../components/common/Seo';
import { ErrorMessage } from '../../components/common/ErrorMessage';
import { ButtonSpinner } from '../../components/common/Loading';
import { TextField } from '../../components/auth/FormField';
import { useAuth } from '../../context/AuthContext';
import { getApiErrorMessage } from '../../services/api';
import { SITE } from '../../data/site';
import { loginFormSchema } from './loginSchema';

const schema = loginFormSchema;

type FormValues = z.infer<typeof schema>;

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting }
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { email: '', password: '', rememberMe: false } });

  async function onSubmit(values: FormValues) {
    setFormError(null);
    try {
      const user = await login(values.email, values.password, Boolean(values.rememberMe));
      if (user.passwordResetRequired) {
        navigate(user.role === 'ADMIN' ? '/admin/profile' : '/college/profile', { replace: true });
        return;
      }
      navigate(user.role === 'ADMIN' ? '/admin' : '/college', { replace: true });
    } catch (error) {
      setFormError(getApiErrorMessage(error, 'Invalid email or password.'));
    }
  }

  function submitWithAutofill(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const email = (form.elements.namedItem('email') as HTMLInputElement | null)?.value ?? '';
    const password = (form.elements.namedItem('password') as HTMLInputElement | null)?.value ?? '';
    const rememberMe = (form.elements.namedItem('rememberMe') as HTMLInputElement | null)?.checked ?? false;
    setValue('email', email, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
    setValue('password', password, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
    setValue('rememberMe', rememberMe);
    void handleSubmit(onSubmit)();
  }

  return (
    <>
      <Seo title="Login" path="/login" description="College and administrator login for SV Yuva Suraksha Yojana." />
      <main id="main-content" className="mx-auto w-full max-w-md px-4 py-12">
        <div className="border border-slate-300 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center gap-3">
            <img src={SITE.logoSrc} alt={SITE.logoAlt} className="h-12 w-12" />
            <div>
              <h1 className="text-xl font-semibold text-navy">Login</h1>
              <p className="text-xs text-slate-600">{SITE.shortName}</p>
            </div>
          </div>
          {formError ? <ErrorMessage message={formError} /> : null}
          <form className="mt-4 space-y-4" onSubmit={submitWithAutofill} noValidate>
            <TextField label="Email" type="email" autoComplete="email" error={errors.email?.message} {...register('email')} />
            <div>
              <TextField
                label="Password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                error={errors.password?.message}
                {...register('password')}
              />
              <button type="button" className="mt-1 text-xs font-medium text-navy underline" onClick={() => setShowPassword((value) => !value)}>
                {showPassword ? 'Hide password' : 'Show password'}
              </button>
            </div>
            <div className="flex items-center gap-2">
              <input
                id="rememberMe"
                type="checkbox"
                className="h-4 w-4 border-slate-300 text-navy focus:ring-navy"
                {...register('rememberMe')}
              />
              <label htmlFor="rememberMe" className="text-sm text-slate-700">
                Remember me
              </label>
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              aria-busy={isSubmitting}
              className="inline-flex w-full items-center justify-center gap-2 bg-navy py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            >
              {isSubmitting ? <ButtonSpinner /> : null}
              {isSubmitting ? 'Signing in…' : 'Login'}
            </button>
          </form>
          <p className="mt-4 text-sm">
            <Link to="/forgot-password" className="text-navy underline">
              Forgot password?
            </Link>
          </p>
          <p className="mt-2 text-sm text-slate-700">
            College not registered?{' '}
            <Link to="/signup" className="font-semibold text-navy underline">
              Sign up
            </Link>
          </p>
        </div>
      </main>
    </>
  );
}
