'use client';

import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useSyncExternalStore } from 'react';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';

const subscribe = () => () => {};

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );

  return (
    <div
      role="group"
      aria-label="Color theme"
      className="inline-flex shrink-0 gap-1 rounded-xl border border-border bg-muted/60 p-1"
    >
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label="Light theme"
        title="Light theme"
        aria-pressed={mounted && resolvedTheme === 'light'}
        onClick={() => setTheme('light')}
        className="bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground dark:bg-transparent dark:text-muted-foreground dark:hover:bg-muted dark:hover:text-foreground"
      >
        <Sun aria-hidden="true" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label="Dark theme"
        title="Dark theme"
        aria-pressed={mounted && resolvedTheme === 'dark'}
        onClick={() => setTheme('dark')}
        className="text-muted-foreground dark:bg-primary dark:text-primary-foreground dark:hover:bg-primary/90 dark:hover:text-primary-foreground"
      >
        <Moon aria-hidden="true" />
      </Button>
    </div>
  );
}

export function PublicThemeToggle() {
  const pathname = usePathname();
  if (
    ![
      '/',
      '/login',
      '/register',
      '/forgot-password',
      '/reset-password',
    ].includes(pathname)
  )
    return null;
  return (
    <div className="absolute right-4 top-4 z-10">
      <ThemeToggle />
    </div>
  );
}
