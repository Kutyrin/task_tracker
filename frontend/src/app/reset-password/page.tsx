'use client';
import { Alert } from '@/components/ui/alert';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

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
      <Card asChild>
        <section className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-sm">
          <p className="text-sm font-medium text-muted-foreground">
            Task Tracker
          </p>

          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
            Reset password
          </h1>

          {success ? (
            <div className="mt-6">
              <p
                role="status"
                className="text-sm leading-6 text-muted-foreground"
              >
                Your password has been changed successfully. Sign in with your
                new password to continue.
              </p>

              <Button asChild variant="default">
                <Link href="/login" className="mt-6 w-full">
                  Sign in
                </Link>
              </Button>
            </div>
          ) : !token ? (
            <div className="mt-6">
              <p role="alert" className="text-sm leading-6 text-destructive">
                This reset link is invalid or expired. Request a new one.
              </p>

              <Link
                href="/forgot-password"
                className="mt-6 block text-sm font-medium text-foreground underline underline-offset-4"
              >
                Request a new reset link
              </Link>
            </div>
          ) : (
            <>
              <p className="mt-2 text-sm text-muted-foreground">
                Choose a new password for your account.
              </p>

              <form
                className="mt-8 space-y-5"
                onSubmit={handleSubmit(onSubmit)}
              >
                <Label className="block">
                  <span className="text-sm font-medium text-foreground">
                    New password
                  </span>

                  <Input
                    {...register('password')}
                    type="password"
                    autoComplete="new-password"
                    required
                    className="mt-2 w-full"
                  />

                  {errors.password && (
                    <span className="mt-1 block text-sm text-destructive">
                      {errors.password.message}
                    </span>
                  )}
                </Label>

                <Label className="block">
                  <span className="text-sm font-medium text-foreground">
                    Confirm new password
                  </span>

                  <Input
                    {...register('confirmPassword')}
                    type="password"
                    autoComplete="new-password"
                    required
                    className="mt-2 w-full"
                  />

                  {errors.confirmPassword && (
                    <span className="mt-1 block text-sm text-destructive">
                      {errors.confirmPassword.message}
                    </span>
                  )}
                </Label>

                {serverError && (
                  <Alert variant="destructive">{serverError}</Alert>
                )}

                <Button
                  variant="default"
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full"
                >
                  {isSubmitting ? 'Resetting...' : 'Reset password'}
                </Button>
              </form>
            </>
          )}

          <p className="mt-6 text-center text-sm text-muted-foreground">
            <Link
              href="/login"
              className="font-medium text-foreground underline underline-offset-4"
            >
              Back to sign in
            </Link>
          </p>
        </section>
      </Card>
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center px-6 py-12">
          <p className="text-sm text-muted-foreground">Loading reset form...</p>
        </main>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
