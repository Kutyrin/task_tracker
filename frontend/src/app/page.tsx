export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <section className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-10 shadow-sm">
        <span className="text-sm font-medium text-slate-500">
          Task Tracker
        </span>

        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">
          Manage your projects and tasks in one place.
        </h1>

        <p className="mt-4 max-w-xl text-base leading-7 text-slate-600">
          A full-stack task management application with projects, boards,
          real-time updates, comments, labels, attachments, and statistics.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <div className="rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-700">
            Next.js
          </div>
          <div className="rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-700">
            TypeScript
          </div>
          <div className="rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-700">
            NestJS
          </div>
          <div className="rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-700">
            PostgreSQL
          </div>
        </div>
      </section>
    </main>
  );
}
