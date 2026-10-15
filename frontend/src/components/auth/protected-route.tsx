'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Layers3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme-toggle';

import { NotificationBell } from '@/components/notifications/notification-bell';
import { useAppSelector } from '@/store/hooks';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, initialized } = useAppSelector((state) => state.auth);

  useEffect(() => {
    if (initialized && !user) {
      router.replace('/login');
    }
  }, [initialized, user, router]);

  if (!initialized) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </main>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex min-h-16 max-w-7xl flex-wrap items-center gap-3 px-6 py-3">
          <Link
            href="/dashboard"
            className="mr-auto flex items-center gap-2 text-sm font-semibold tracking-tight text-foreground"
          >
            <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Layers3 className="size-5" aria-hidden="true" />
            </span>
            Task Tracker
          </Link>
          <nav
            aria-label="Main navigation"
            className="order-last flex w-full gap-1 sm:order-none sm:w-auto"
          >
            {[
              ['/dashboard', 'Overview'],
              ['/projects', 'Projects'],
              ['/calendar', 'Calendar'],
            ].map(([href, title]) => (
              <Button
                key={href}
                asChild
                size="sm"
                variant={pathname.startsWith(href) ? 'secondary' : 'ghost'}
              >
                <Link
                  href={href}
                  aria-current={pathname.startsWith(href) ? 'page' : undefined}
                >
                  {title}
                </Link>
              </Button>
            ))}
          </nav>
          <NotificationBell />
          <ThemeToggle />
        </div>
      </header>

      {children}
    </div>
  );
}
