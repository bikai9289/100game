import { cn } from '@/lib/utils';

export function Logo({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-flex size-8 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground',
        className
      )}
    >
      100
    </span>
  );
}
