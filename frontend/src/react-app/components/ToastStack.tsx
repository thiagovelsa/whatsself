import type { ReactElement } from 'react';
import { CheckCircle, Info, AlertTriangle, X } from 'lucide-react';
import { useNotificationStore, NotificationType } from '../stores/useNotificationStore';

const iconMap: Record<NotificationType, ReactElement> = {
  success: <CheckCircle className="w-4 h-4 text-green-400" />,
  error: <AlertTriangle className="w-4 h-4 text-red-400" />,
  info: <Info className="w-4 h-4 text-blue-400" />
};

const typeStyles: Record<NotificationType, string> = {
  success: 'bg-green-900/80 border-green-700',
  error: 'bg-red-900/80 border-red-700',
  info: 'bg-blue-900/80 border-blue-700'
};

export default function ToastStack() {
  const { notifications, removeNotification } = useNotificationStore();

  return (
    <div className="fixed bottom-4 right-4 flex flex-col gap-3 z-50">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={`flex items-center gap-3 px-4 py-3 min-w-[260px] rounded-lg border ${typeStyles[notification.type]} shadow-lg`}
        >
          <div>{iconMap[notification.type]}</div>
          <div className="flex-1 text-sm text-white">{notification.message}</div>
          <button
            onClick={() => removeNotification(notification.id)}
            className="text-gray-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
