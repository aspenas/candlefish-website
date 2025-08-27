import React from 'react';
import { cn } from '../../lib/utils';

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number;
  max?: number;
}

export const Progress: React.FC<ProgressProps> = ({ 
  value, 
  max = 100, 
  className, 
  ...props 
}) => {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));

  return (
    <div
      className={cn(
        'relative h-4 w-full overflow-hidden rounded-full bg-gray-700',
        className
      )}
      {...props}
    >
      <div
        className="h-full w-full flex-1 bg-blue-600 transition-all"
        style={{
          transform: `translateX(-${100 - percentage}%)`
        }}
      />
    </div>
  );
};