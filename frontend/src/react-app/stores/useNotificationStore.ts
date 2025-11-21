import { create } from 'zustand';

export type NotificationType = 'success' | 'error' | 'info';

export interface Notification {
  id: string;
  message: string;
  type: NotificationType;
  duration?: number;
}

interface NotificationState {
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id'> & { id?: string }) => void;
  removeNotification: (id: string) => void;
}

const createId = () => `toast_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  addNotification: (notification) => {
    const id = notification.id ?? createId();
    const entry: Notification = {
      id,
      message: notification.message,
      type: notification.type,
      duration: notification.duration ?? 4000
    };

    set((state) => {
      const next = [...state.notifications, entry];
      return { notifications: next.slice(-5) };
    });

    setTimeout(() => {
      useNotificationStore.getState().removeNotification(id);
    }, entry.duration);
  },
  removeNotification: (id) => {
    set((state) => ({
      notifications: state.notifications.filter((note) => note.id !== id)
    }));
  }
}));

export const notificationActions = {
  notify: (notification: Omit<Notification, 'id'> & { id?: string }) =>
    useNotificationStore.getState().addNotification(notification),
  dismiss: (id: string) => useNotificationStore.getState().removeNotification(id)
};
