import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean; // Cmd on Mac
  action: () => void;
  description?: string;
}

export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[]) {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      shortcuts.forEach((shortcut) => {
        // For Ctrl/Cmd shortcuts, accept either Ctrl (Windows/Linux) or Cmd (Mac)
        const ctrlOrCmd = event.ctrlKey || event.metaKey;
        const ctrlMatch = shortcut.ctrl ? ctrlOrCmd : !ctrlOrCmd;
        const shiftMatch = shortcut.shift ? event.shiftKey : !event.shiftKey;
        const altMatch = shortcut.alt ? event.altKey : !event.altKey;
        const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();

        if (ctrlMatch && shiftMatch && altMatch && keyMatch) {
          // Don't trigger if user is typing in an input/textarea
          const target = event.target as HTMLElement;
          const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
          
          if (!isInput) {
            event.preventDefault();
            shortcut.action();
          }
        }
      });
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [shortcuts, navigate, location]);
}

// Common shortcuts helper
export const commonShortcuts = {
  navigateToDashboard: (navigate: ReturnType<typeof useNavigate>) => () => navigate('/dashboard'),
  navigateToMessages: (navigate: ReturnType<typeof useNavigate>) => () => navigate('/messages'),
  navigateToContacts: (navigate: ReturnType<typeof useNavigate>) => () => navigate('/contacts'),
  navigateToTemplates: (navigate: ReturnType<typeof useNavigate>) => () => navigate('/templates'),
  navigateToTriggers: (navigate: ReturnType<typeof useNavigate>) => () => navigate('/triggers'),
  navigateToFlows: (navigate: ReturnType<typeof useNavigate>) => () => navigate('/flows'),
  navigateToSettings: (navigate: ReturnType<typeof useNavigate>) => () => navigate('/settings'),
  navigateToQR: (navigate: ReturnType<typeof useNavigate>) => () => navigate('/qr'),
  refresh: (refetch: () => void) => () => refetch(),
  closeModal: (onClose: () => void) => () => onClose(),
};

