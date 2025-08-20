import React from 'react';
import { cn } from '../../utils/cn';

export interface ProgressProps {
  value: number; // 0-100
  max?: number;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'success' | 'warning' | 'error';
  showLabel?: boolean;
  label?: string;
  className?: string;
}

const Progress: React.FC<ProgressProps> = ({
  value,
  max = 100,
  size = 'md',
  variant = 'default',
  showLabel = false,
  label,
  className,
}) => {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  const sizeClasses = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3',
  };

  const variantClasses = {
    default: 'bg-sea-glow',
    success: 'bg-green-500',
    warning: 'bg-yellow-500',
    error: 'bg-red-500',
  };

  return (
    <div className={cn('w-full', className)}>
      {(showLabel || label) && (
        <div className="flex justify-between items-center mb-1">
          <span className="text-sm font-medium text-slate">
            {label || 'Progress'}
          </span>
          <span className="text-sm text-mist">
            {Math.round(percentage)}%
          </span>
        </div>
      )}
      
      <div 
        className={cn(
          'w-full bg-mist/10 rounded-full overflow-hidden',
          sizeClasses[size]
        )}
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={label}
      >
        <div
          className={cn(
            'h-full transition-all duration-300 ease-in-out rounded-full',
            variantClasses[variant]
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

export interface SteppedProgressProps {
  currentStep: number;
  totalSteps: number;
  steps?: Array<{
    label: string;
    description?: string;
  }>;
  variant?: 'horizontal' | 'vertical';
  className?: string;
}

const SteppedProgress: React.FC<SteppedProgressProps> = ({
  currentStep,
  totalSteps,
  steps,
  variant = 'horizontal',
  className,
}) => {
  const isHorizontal = variant === 'horizontal';

  return (
    <div className={cn('w-full', className)}>
      <div 
        className={cn(
          'flex',
          isHorizontal ? 'items-center space-x-4' : 'flex-col space-y-4'
        )}
      >
        {Array.from({ length: totalSteps }, (_, index) => {
          const stepNumber = index + 1;
          const isActive = stepNumber === currentStep;
          const isCompleted = stepNumber < currentStep;
          const stepInfo = steps?.[index];

          return (
            <div 
              key={stepNumber}
              className={cn(
                'flex items-center',
                !isHorizontal && 'w-full',
                isHorizontal && index < totalSteps - 1 && 'flex-1'
              )}
            >
              {/* Step Circle */}
              <div
                className={cn(
                  'flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-colors',
                  isCompleted && 'bg-sea-glow text-white',
                  isActive && 'bg-sea-glow/20 text-sea-glow border-2 border-sea-glow',
                  !isActive && !isCompleted && 'bg-mist/10 text-mist border-2 border-mist/20'
                )}
                aria-current={isActive ? 'step' : undefined}
              >
                {isCompleted ? (
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                ) : (
                  stepNumber
                )}
              </div>

              {/* Step Label */}
              {stepInfo && (
                <div className={cn('ml-3', !isHorizontal && 'flex-1')}>
                  <p
                    className={cn(
                      'text-sm font-medium',
                      isActive ? 'text-sea-glow' : 'text-slate'
                    )}
                  >
                    {stepInfo.label}
                  </p>
                  {stepInfo.description && (
                    <p className="text-xs text-mist mt-1">
                      {stepInfo.description}
                    </p>
                  )}
                </div>
              )}

              {/* Connector Line */}
              {isHorizontal && index < totalSteps - 1 && (
                <div
                  className={cn(
                    'flex-1 h-0.5 mx-4',
                    isCompleted ? 'bg-sea-glow' : 'bg-mist/20'
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export { Progress, SteppedProgress };