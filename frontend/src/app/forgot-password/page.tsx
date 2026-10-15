'use client';
import { Alert } from '@/components/ui/alert';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

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
      <Card asChild>
        <section className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-sm">
          <p className="text-sm font-medium text-muted-foreground">
            Task Tracker
          </p>

          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
            Forgot password?
          </h1>

          {!submitted ? (
            <>
              <p className="mt-2 text-sm text-muted-foreground">
                Enter your email address and we will send instructions to reset
                your password if an account exists.
              </p>

              <form
                className="mt-8 space-y-5"
                onSubmit={handleSubmit(onSubmit)}
              >
                <Label className="block">
                  <span className="text-sm font-medium text-foreground">
                    Email
                  </span>

                  <Input
                    {...register('email')}
                    type="email"
                    autoComplete="email"
                    required
                    className="mt-2 w-full"
                    placeholder="you@example.com"
                  />

                  {errors.email && (
                    <span className="mt-1 block text-sm text-destructive">
                      {errors.email.message}
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
                  {isSubmitting ? 'Sending...' : 'Send reset instructions'}
                </Button>
              </form>
            </>
          ) : (
            <div className="mt-6">
              <p
                role="status"
                className="text-sm leading-6 text-muted-foreground"
              >
                If an account with that email exists, password reset
                instructions have been sent. Check your inbox.
              </p>

              <Button
                variant="ghost"
                type="button"
                onClick={() => setSubmitted(false)}
                className="mt-4"
              >
                Try another email
              </Button>
            </div>
          )}

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Remember your password?{' '}
            <Link
              href="/login"
              className="font-medium text-foreground underline underline-offset-4"
            >
              Sign in
            </Link>
          </p>
        </section>
      </Card>
    </main>
  );
}
