'use client';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import {
  useMarkAllNotificationsAsRead,
  useMarkNotificationAsRead,
  useNotifications,
} from '@/hooks/notifications/use-notifications';

function formatNotificationDate(value: string) {
  return new Intl.DateTimeFormat('en', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value));
}

function getNotificationHref(taskId: number | null, projectId: number | null) {
  if (taskId) {
    return `/tasks/${taskId}`;
  }

  if (projectId) {
    return `/projects/${projectId}`;
  }

  return null;
}

export function NotificationBell() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  const { data } = useNotifications();
  const markAsRead = useMarkNotificationAsRead();
  const markAllAsRead = useMarkAllNotificationsAsRead();

  const notifications = data?.data ?? [];
  const unreadCount = data?.unreadCount ?? 0;

  const handleNotificationClick = async (
    notificationId: number,
    readAt: string | null,
    taskId: number | null,
    projectId: number | null,
  ) => {
    if (!readAt) {
      await markAsRead.mutateAsync(notificationId);
    }

    const href = getNotificationHref(taskId, projectId);

    if (href) {
      setIsOpen(false);
      router.push(href);
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          type="button"
          aria-label="Notifications"
          aria-expanded={isOpen}
          className="relative w-10"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 17H9m9-2V11a6 6 0 0 0-12 0v4l-2 2h16l-2-2Zm-4 4a2 2 0 0 1-4 0"
            />
          </svg>

          {unreadCount > 0 && (
            <span className="absolute -right-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold text-white">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        aria-label="Notifications"
        className="w-[min(24rem,calc(100vw-2rem))] gap-0 overflow-hidden rounded-2xl p-0 shadow-lg"
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold text-foreground">
              Notifications
            </h2>

            <p className="mt-0.5 text-xs text-muted-foreground">
              {unreadCount} unread
            </p>
          </div>

          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              type="button"
              onClick={() => markAllAsRead.mutate()}
              disabled={markAllAsRead.isPending}
            >
              Mark all as read
            </Button>
          )}
        </div>

        <div className="max-h-112 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <p className="text-sm font-medium text-foreground">
                No notifications
              </p>

              <p className="mt-1 text-xs text-muted-foreground">
                You&apos;re all caught up.
              </p>
            </div>
          ) : (
            notifications.map((notification) => {
              const href = getNotificationHref(
                notification.taskId,
                notification.projectId,
              );

              return (
                <Button
                  variant="ghost"
                  key={notification.id}
                  type="button"
                  onClick={() =>
                    void handleNotificationClick(
                      notification.id,
                      notification.readAt,
                      notification.taskId,
                      notification.projectId,
                    )
                  }
                  className={`block h-auto w-full whitespace-normal rounded-none border-b border-border px-4 py-3 text-left transition last:border-b-0 hover:bg-muted/40 ${
                    notification.readAt ? 'bg-card' : 'bg-muted/60'
                  }`}
                >
                  <div className="flex gap-3">
                    <span
                      className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                        notification.readAt ? 'bg-muted' : 'bg-primary'
                      }`}
                    />

                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-foreground">
                        {notification.message}
                      </p>

                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatNotificationDate(notification.createdAt)}
                      </p>

                      {href && (
                        <p className="mt-1 text-xs font-medium text-foreground">
                          Open related item
                        </p>
                      )}
                    </div>
                  </div>
                </Button>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
