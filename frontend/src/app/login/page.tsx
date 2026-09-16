"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { useState } from "react";
import { z } from "zod";

import { getCurrentUser, login } from "@/lib/auth";
import { saveTokens } from "@/lib/auth-storage";
import { useAppDispatch } from "@/store/hooks";
import { setCredentials, setTokens } from "@/store/auth-slice";

const schema = z.object({
  email: z.email("Enter a valid email"),
  password: z.string().min(6, "Password must contain at least 6 characters"),
});

type FormValues = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [serverError, setServerError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (values: FormValues) => {
    setServerError("");

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

      router.push("/dashboard");
    } catch {
      setServerError("Invalid email or password");
    }
  };

  return (
    <main className='flex min-h-screen items-center justify-center px-6 py-12'>
      <section className='w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm'>
        <div>
          <p className='text-sm font-medium text-slate-500'>Task Tracker</p>

          <h1 className='mt-2 text-3xl font-semibold tracking-tight text-slate-950'>
            Welcome back
          </h1>

          <p className='mt-2 text-sm text-slate-600'>
            Sign in to continue to your workspace.
          </p>
        </div>

        <form className='mt-8 space-y-5' onSubmit={handleSubmit(onSubmit)}>
          <label className='block'>
            <span className='text-sm font-medium text-slate-700'>Email</span>
            <input
              {...register('email')}
              type='email'
              autoComplete='email'
              className='mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none transition focus:border-slate-900'
              placeholder='you@example.com'
            />
            {errors.email && (
              <span className='mt-1 block text-sm text-red-600'>
                {errors.email.message}
              </span>
            )}
          </label>

          <label className='block'>
            <span className='text-sm font-medium text-slate-700'>Password</span>
            <input
              {...register('password')}
              type='password'
              autoComplete='current-password'
              className='mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none transition focus:border-slate-900'
              placeholder='&#9679;&#9679;&#9679;&#9679;&#9679;'
            />
            {errors.password && (
              <span className='mt-1 block text-sm text-red-600'>
                {errors.password.message}
              </span>
            )}
          </label>

          {serverError && (
            <p className='rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700'>
              {serverError}
            </p>
          )}

          <button
            type='submit'
            disabled={isSubmitting}
            className='w-full rounded-lg bg-slate-950 px-4 py-2.5 font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60'
          >
            {isSubmitting ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <p className='mt-6 text-center text-sm text-slate-600'>
          Don&apos;t have an account?{' '}
          <Link
            href='/register'
            className='font-medium text-slate-950 underline underline-offset-4'
          >
            Create one
          </Link>
        </p>
      </section>
    </main>
  );
}
