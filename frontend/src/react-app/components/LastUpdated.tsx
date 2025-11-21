import { useMemo } from 'react';
import { Clock } from 'lucide-react';

interface LastUpdatedProps {
  updatedAt: Date | number | string | null | undefined;
  className?: string;
}

export default function LastUpdated({ updatedAt, className = '' }: LastUpdatedProps) {
  const timeAgo = useMemo(() => {
    if (!updatedAt) return null;

    const updated = typeof updatedAt === 'string' || typeof updatedAt === 'number' 
      ? new Date(updatedAt) 
      : updatedAt;
    
    const now = new Date();
    const diffMs = now.getTime() - updated.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Agora mesmo';
    if (diffMins < 60) return `há ${diffMins} minuto${diffMins > 1 ? 's' : ''}`;
    if (diffHours < 24) return `há ${diffHours} hora${diffHours > 1 ? 's' : ''}`;
    if (diffDays < 7) return `há ${diffDays} dia${diffDays > 1 ? 's' : ''}`;
    
    return updated.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  }, [updatedAt]);

  const isStale = useMemo(() => {
    if (!updatedAt) return true;
    const updated = typeof updatedAt === 'string' || typeof updatedAt === 'number' 
      ? new Date(updatedAt) 
      : updatedAt;
    const diffMs = Date.now() - updated.getTime();
    return diffMs > 5 * 60 * 1000; // More than 5 minutes
  }, [updatedAt]);

  if (!timeAgo) {
    return null;
  }

  return (
    <div className={`flex items-center gap-2 text-xs ${className}`}>
      <Clock className={`h-3.5 w-3.5 ${isStale ? 'text-amber-400' : 'text-brand-muted'}`} />
      <span className={isStale ? 'text-amber-300' : 'text-brand-muted'}>
        Atualizado {timeAgo}
      </span>
    </div>
  );
}

