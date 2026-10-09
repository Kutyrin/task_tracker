'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { resetPassword } from '@/lib/auth';

const schema = z
  .object({
    password: z
      .string()
      .min(6, 'Password must contain at least 6 characters')
      .max(128, 'Password must contain at most 128 characters'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type FormValues = z.infer<typeof schema>;

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [success, setSuccess] = useState(false);
  const [serverError, setServerError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (values: FormValues) => {
    setServerError('');

    if (!token) {
      setServerError(
        'This reset link is invalid or expired. Request a new one.',
      );
      return;
    }

    try {
      await resetPassword(token, values.password);
      setSuccess(true);
    } catch {
      setServerError(
        'This reset link is invalid or expired. Request a new one.',
      );
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-medium text-slate-500">Task Tracker</p>

        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
          Reset password
        </h1>

        {success ? (
          <div className="mt-6">
            <p role="status" className="text-sm leading-6 text-slate-600">
              Your password has been changed successfully. Sign in with your new
              password to continue.
            </p>

            <Link
              href="/login"
              className="mt-6 block w-full rounded-lg bg-slate-950 px-4 py-2.5 text-center font-medium text-white transition hover:bg-slate-800"
            >
              Sign in
            </Link>
          </div>
        ) : !token ? (
          <div className="mt-6">
            <p role="alert" className="text-sm leading-6 text-red-700">
              This reset link is invalid or expired. Request a new one.
            </p>

            <Link
              href="/forgot-password"
              className="mt-6 block text-sm font-medium text-slate-950 underline underline-offset-4"
            >
              Request a new reset link
            </Link>
          </div>
        ) : (
          <>
            <p className="mt-2 text-sm text-slate-600">
              Choose a new password for your account.
            </p>

            <form className="mt-8 space-y-5" onSubmit={handleSubmit(onSubmit)}>
              <label className="block">
                <span className="text-sm font-medium text-slate-700">
                  New password
                </span>

                <input
                  {...register('password')}
                  type="password"
                  autoComplete="new-password"
                  required
                  className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none transition focus:border-slate-900"
                />

                {errors.password && (
                  <span className="mt-1 block text-sm text-red-600">
                    {errors.password.message}
                  </span>
                )}
              </label>

              <label className="block">
                <span className="text-sm font-medium text-slate-700">
                  Confirm new password
                </span>

                <input
                  {...register('confirmPassword')}
                  type="password"
                  autoComplete="new-password"
                  required
                  className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none transition focus:border-slate-900"
                />

                {errors.confirmPassword && (
                  <span className="mt-1 block text-sm text-red-600">
                    {errors.confirmPassword.message}
                  </span>
                )}
              </label>

              {serverError && (
                <p
                  role="alert"
                  className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700"
                >
                  {serverError}
                </p>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-lg bg-slate-950 px-4 py-2.5 font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? 'Resetting...' : 'Reset password'}
              </button>
            </form>
          </>
        )}

        <p className="mt-6 text-center text-sm text-slate-600">
          <Link
            href="/login"
            className="font-medium text-slate-950 underline underline-offset-4"
          >
            Back to sign in
          </Link>
        </p>
      </section>
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center px-6 py-12">
          <p className="text-sm text-slate-600">Loading reset form...</p>
        </main>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
