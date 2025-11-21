interface StatusBadgeProps {
  status: 'online' | 'offline' | 'connecting' | 'error';
  children: React.ReactNode;
}

export default function StatusBadge({ status, children }: StatusBadgeProps) {
  const getStatusStyles = () => {
    switch (status) {
      case 'online':
        return 'bg-emerald-500/10 text-emerald-200 border-emerald-400/30';
      case 'offline':
        return 'bg-slate-900/80 text-slate-300 border-slate-700';
      case 'connecting':
        return 'bg-amber-500/10 text-amber-200 border-amber-400/30';
      case 'error':
        return 'bg-rose-500/10 text-rose-200 border-rose-400/30';
      default:
        return 'bg-slate-900/80 text-slate-300 border-slate-700';
    }
  };

  const getDotColor = () => {
    switch (status) {
      case 'online':
        return 'bg-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.6)]';
      case 'offline':
        return 'bg-slate-500';
      case 'connecting':
        return 'bg-amber-400 animate-pulse shadow-[0_0_12px_rgba(245,158,11,0.55)]';
      case 'error':
        return 'bg-rose-400 shadow-[0_0_12px_rgba(251,113,133,0.6)]';
      default:
        return 'bg-slate-500';
    }
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusStyles()}`}>
      <div className={`w-2 h-2 rounded-full mr-2 ${getDotColor()}`} />
      {children}
    </span>
  );
}
