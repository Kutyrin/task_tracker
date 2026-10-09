'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { requestPasswordReset } from '@/lib/auth';

const schema = z.object({
  email: z.email('Enter a valid email'),
});

type FormValues = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const [submitted, setSubmitted] = useState(false);
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

    try {
      await requestPasswordReset(values.email);
      setSubmitted(true);
    } catch {
      setServerError(
        'Unable to process your request right now. Please try again later.',
      );
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-medium text-slate-500">Task Tracker</p>

        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
          Forgot password?
        </h1>

        {!submitted ? (
          <>
            <p className="mt-2 text-sm text-slate-600">
              Enter your email address and we will send instructions to reset
              your password if an account exists.
            </p>

            <form className="mt-8 space-y-5" onSubmit={handleSubmit(onSubmit)}>
              <label className="block">
                <span className="text-sm font-medium text-slate-700">
                  Email
                </span>

                <input
                  {...register('email')}
                  type="email"
                  autoComplete="email"
                  required
                  className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none transition focus:border-slate-900"
                  placeholder="you@example.com"
                />

                {errors.email && (
                  <span className="mt-1 block text-sm text-red-600">
                    {errors.email.message}
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
                {isSubmitting ? 'Sending...' : 'Send reset instructions'}
              </button>
            </form>
          </>
        ) : (
          <div className="mt-6">
            <p role="status" className="text-sm leading-6 text-slate-600">
              If an account with that email exists, password reset instructions
              have been sent. Check your inbox.
            </p>

            <button
              type="button"
              onClick={() => setSubmitted(false)}
              className="mt-4 text-sm font-medium text-slate-950 underline underline-offset-4"
            >
              Try another email
            </button>
          </div>
        )}

        <p className="mt-6 text-center text-sm text-slate-600">
          Remember your password?{' '}
          <Link
            href="/login"
            className="font-medium text-slate-950 underline underline-offset-4"
          >
            Sign in
          </Link>
        </p>
      </section>
    </main>
  );
}
