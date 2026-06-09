import * as React from 'react';
import { cn } from '@/lib/utils';

const Progress = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { value?: number }
>(({ className, value, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'relative h-4 w-full overflow-hidden rounded-full bg-secondary',
      className
    )}
    {...props}
  >
    <div
      className="h-full bg-primary transition-all duration-300"
      style={{ width: `${Math.min(value || 0, 100)}%` }}
    />
  </div>
));
Progress.displayName = 'Progress';

export { Progress };
