import React from 'react';
import clsx from 'clsx';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  text?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'md', 
  className,
  text 
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16',
  };

  return (
    <div className={clsx('flex flex-col items-center justify-center', className)}>
      <div className="relative">
        {/* Outer ring */}
        <div className={clsx(
          'animate-spin rounded-full border-2 border-soc-border',
          sizeClasses[size]
        )}>
          <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-security-500"></div>
        </div>
        
        {/* Inner ring */}
        <div className={clsx(
          'absolute inset-1 animate-spin rounded-full border border-soc-border',
          'animate-spin-slow'
        )}>
          <div className="absolute inset-0 rounded-full border border-transparent border-t-security-400"></div>
        </div>
      </div>
      
      {text && (
        <div className="mt-3 text-sm text-soc-muted animate-pulse">
          {text}
        </div>
      )}
    </div>
  );
};

export default LoadingSpinner;