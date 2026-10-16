import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <Card asChild>
        <section className="w-full max-w-2xl rounded-2xl border border-border bg-card p-10 shadow-sm">
          <span className="text-sm font-medium text-muted-foreground">
            Task Tracker
          </span>

          <div className="mt-4">
            <Button asChild variant="default">
              <Link href="/dashboard">Dashboard</Link>
            </Button>
          </div>

          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-foreground">
            Manage your projects and tasks in one place.
          </h1>

          <p className="mt-4 max-w-xl text-base leading-7 text-muted-foreground">
            A full-stack task management application with projects, boards,
            real-time updates, comments, labels, attachments, and statistics.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <div className="rounded-lg bg-muted px-3 py-2 text-sm text-foreground">
              Next.js
            </div>
            <div className="rounded-lg bg-muted px-3 py-2 text-sm text-foreground">
              TypeScript
            </div>
            <div className="rounded-lg bg-muted px-3 py-2 text-sm text-foreground">
              NestJS
            </div>
            <div className="rounded-lg bg-muted px-3 py-2 text-sm text-foreground">
              PostgreSQL
            </div>
          </div>
        </section>
      </Card>
    </main>
  );
}
