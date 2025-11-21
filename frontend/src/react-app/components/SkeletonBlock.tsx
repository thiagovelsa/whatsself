interface SkeletonBlockProps {
  className?: string;
}

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

export default function SkeletonBlock({ className }: SkeletonBlockProps) {
  return <div className={cn('animate-pulse rounded-2xl bg-brand-surface/50', className)} />;
}

