'use client';
import { Alert } from '@/components/ui/alert';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { useState } from 'react';
import { z } from 'zod';

import { getCurrentUser, login } from '@/lib/auth';
import { saveTokens } from '@/lib/auth-storage';
import { useAppDispatch } from '@/store/hooks';
import { setCredentials, setTokens } from '@/store/auth-slice';

const schema = z.object({
  email: z.email('Enter a valid email'),
  password: z.string().min(6, 'Password must contain at least 6 characters'),
});

type FormValues = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
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
      const tokens = await login(values.email, values.password);
      saveTokens(tokens);
      dispatch(setTokens(tokens));

      const user = await getCurrentUser();

      dispatch(
        setCredentials({
          user,
          tokens,
        }),
      );

      router.push('/dashboard');
    } catch {
      setServerError('Invalid email or password');
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <Card asChild>
        <section className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-sm">
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              Task Tracker
            </p>

            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
              Welcome back
            </h1>

            <p className="mt-2 text-sm text-muted-foreground">
              Sign in to continue to your workspace.
            </p>
          </div>

          <form className="mt-8 space-y-5" onSubmit={handleSubmit(onSubmit)}>
            <Label className="block">
              <span className="text-sm font-medium text-foreground">Email</span>
              <Input
                {...register('email')}
                type="email"
                autoComplete="email"
                className="mt-2 w-full"
                placeholder="you@example.com"
              />
              {errors.email && (
                <span className="mt-1 block text-sm text-destructive">
                  {errors.email.message}
                </span>
              )}
            </Label>

            <Label className="block">
              <span className="text-sm font-medium text-foreground">
                Password
              </span>
              <Input
                {...register('password')}
                type="password"
                autoComplete="current-password"
                className="mt-2 w-full"
                placeholder="&#9679;&#9679;&#9679;&#9679;&#9679;"
              />
              {errors.password && (
                <span className="mt-1 block text-sm text-destructive">
                  {errors.password.message}
                </span>
              )}
            </Label>

            {serverError && <Alert variant="destructive">{serverError}</Alert>}

            <Button
              variant="default"
              type="submit"
              disabled={isSubmitting}
              className="w-full"
            >
              {isSubmitting ? 'Signing in...' : 'Sign in'}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{' '}
            <Link
              href="/register"
              className="font-medium text-foreground underline underline-offset-4"
            >
              Create one
            </Link>
          </p>

          <p className="mt-4 text-center text-sm text-muted-foreground">
            <Link
              href="/forgot-password"
              className="font-medium text-foreground underline underline-offset-4"
            >
              Forgot password?
            </Link>
          </p>
        </section>
      </Card>
    </main>
  );
}
