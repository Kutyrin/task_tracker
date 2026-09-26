'use client';

import { ProtectedRoute } from '@/components/auth/protected-route';
import { CalendarView } from '@/components/calendar/calendar-view';

function CalendarContent() {
  return (
    <main className="min-h-screen px-6 py-12">
      <div className="mx-auto max-w-7xl">
        <CalendarView />
      </div>
    </main>
  );
}

export default function CalendarPage() {
  return (
    <ProtectedRoute>
      <CalendarContent />
    </ProtectedRoute>
  );
}
