import { api } from './client';

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

export interface NotificationsResponse {
  message: string;
  data: Notification[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export async function getNotifications(page = 1, limit = 20) {
  const { data } = await api.get<NotificationsResponse>('/notifications', {
    params: { page, limit },
  });
  return data;
}

export async function getUnreadCount() {
  const { data } = await api.get<{ message: string; data: { count: number } }>(
    '/notifications/unread-count',
  );
  return data.data.count;
}

export async function markNotificationAsRead(id: string) {
  const { data } = await api.patch<{ message: string }>(
    `/notifications/${id}/read`,
  );
  return data;
}

export async function markAllNotificationsAsRead() {
  const { data } = await api.patch<{ message: string }>('/notifications/read-all');
  return data;
}
