import { useState, useRef, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, Check, CheckCheck, X, Calendar, Clock, Info } from 'lucide-react';
import {
  getNotifications,
  getUnreadCount,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from '../../api/notification';

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function notifIcon(type: string) {
  if (type?.includes('APPOINTMENT') || type?.includes('BOOKED')) return <Calendar className="h-4 w-4 text-indigo-500" />;
  if (type?.includes('CHECKIN') || type?.includes('CHECK')) return <Clock className="h-4 w-4 text-emerald-500" />;
  return <Info className="h-4 w-4 text-slate-400" />;
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['notifications-unread-count'],
    queryFn: getUnreadCount,
    refetchInterval: 30_000,
  });

  const { data: notifData, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => getNotifications(1, 20),
    enabled: open,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
    queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
  };

  const markReadMutation = useMutation({
    mutationFn: markNotificationAsRead,
    onSuccess: invalidate,
  });

  const markAllMutation = useMutation({
    mutationFn: markAllNotificationsAsRead,
    onSuccess: invalidate,
  });

  const notifications = notifData?.data ?? [];

  return (
    <div ref={ref} className="relative">
      {/* ── Bell button ── */}
      <button
        id="notification-bell-btn"
        onClick={() => setOpen(!open)}
        className={`relative flex h-9 w-9 items-center justify-center rounded-xl transition-all duration-200 ${
          open
            ? 'bg-primary-50 text-primary-600'
            : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
        }`}
        aria-label="Notifications"
      >
        <Bell className={`h-5 w-5 transition-transform duration-300 ${open ? 'scale-110' : ''}`} />

        {/* Unread badge with pulse animation */}
        {unreadCount > 0 && (
          <>
            {/* Pulsing ring */}
            <span className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-rose-500 animate-ping opacity-75" />
            {/* Solid dot / count */}
            <span className="absolute right-1.5 top-1.5 flex h-2.5 w-2.5 items-center justify-center rounded-full bg-rose-500">
              {unreadCount > 1 && (
                <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-black text-white ring-2 ring-white">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </span>
          </>
        )}
      </button>

      {/* ── Dropdown ── */}
      {open && (
        <div
          id="notification-dropdown"
          className="absolute right-0 top-full z-50 mt-2.5 w-[340px] overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-2xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between bg-gradient-to-r from-primary-500 to-indigo-600 px-5 py-4">
            <div className="flex items-center gap-2.5">
              <Bell className="h-4 w-4 text-white/80" />
              <h3 className="text-sm font-bold text-white">Notifications</h3>
              {unreadCount > 0 && (
                <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-bold text-white">
                  {unreadCount} unread
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={() => markAllMutation.mutate()}
                  disabled={markAllMutation.isPending}
                  className="flex items-center gap-1 rounded-lg bg-white/15 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-white/25 disabled:opacity-50 transition"
                  title="Mark all as read"
                >
                  <CheckCheck className="h-3 w-3" />
                  All read
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="flex h-6 w-6 items-center justify-center rounded-lg text-white/70 hover:bg-white/20 hover:text-white transition"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="max-h-[380px] overflow-y-auto">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-200 border-t-primary-600" />
                <p className="mt-3 text-xs text-slate-400">Loading notifications...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-14 text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50">
                  <Bell className="h-7 w-7 text-slate-300" />
                </div>
                <p className="font-semibold text-slate-500">You're all caught up!</p>
                <p className="mt-1 text-xs text-slate-300">No new notifications right now.</p>
              </div>
            ) : (
              <ul className="divide-y divide-slate-50">
                {notifications.map((n) => (
                  <li
                    key={n.id}
                    className={`flex gap-3 px-4 py-3.5 transition-colors hover:bg-slate-50/80 ${
                      !n.isRead ? 'bg-indigo-50/40' : 'bg-white'
                    }`}
                  >
                    {/* Icon container */}
                    <div className={`mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl ${
                      !n.isRead ? 'bg-indigo-100' : 'bg-slate-100'
                    }`}>
                      {notifIcon(n.type ?? '')}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-sm leading-snug text-slate-900 ${!n.isRead ? 'font-bold' : 'font-medium'}`}>
                          {n.title}
                        </p>
                        {!n.isRead && (
                          <button
                            onClick={() => markReadMutation.mutate(n.id)}
                            disabled={markReadMutation.isPending && markReadMutation.variables === n.id}
                            className="mt-0.5 flex-shrink-0 rounded-md p-0.5 text-primary-400 hover:bg-primary-50 hover:text-primary-600 transition"
                            title="Mark as read"
                          >
                            <Check className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-slate-500 line-clamp-2 leading-relaxed">{n.message}</p>
                      <p className="mt-1.5 text-[10px] font-semibold text-slate-300 uppercase tracking-wide">
                        {timeAgo(n.createdAt)}
                      </p>
                    </div>

                    {/* Unread dot */}
                    {!n.isRead && (
                      <div className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary-500" />
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="border-t border-slate-50 px-4 py-3 bg-slate-50/50">
              <p className="text-center text-[10px] font-semibold text-slate-300 uppercase tracking-wider">
                Showing last {notifications.length} notifications
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
