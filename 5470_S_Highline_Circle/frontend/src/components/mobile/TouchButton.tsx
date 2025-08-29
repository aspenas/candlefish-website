import React, { useState, useRef, ReactNode } from 'react';
import { useHapticFeedback } from '../../hooks/useMobileGestures';
import clsx from 'clsx';

export interface TouchButtonProps {
  children: ReactNode;
  onClick?: () => void;
  onLongPress?: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'ghost';
  size?: 'small' | 'medium' | 'large' | 'xl';
  fullWidth?: boolean;
  loading?: boolean;
  hapticFeedback?: 'light' | 'medium' | 'heavy' | 'none';
  className?: string;
  type?: 'button' | 'submit' | 'reset';
  ariaLabel?: string;
  testId?: string;
}

const TouchButton: React.FC<TouchButtonProps> = ({
  children,
  onClick,
  onLongPress,
  disabled = false,
  variant = 'primary',
  size = 'medium',
  fullWidth = false,
  loading = false,
  hapticFeedback = 'light',
  className = '',
  type = 'button',
  ariaLabel,
  testId
}) => {
  const [isPressed, setIsPressed] = useState(false);
  const [ripples, setRipples] = useState<{ id: number; x: number; y: number }[]>([]);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const rippleCounter = useRef(0);

  const { impact } = useHapticFeedback();

  // Variant styles
  const variantStyles = {
    primary: {
      base: 'bg-indigo-600 text-white border-transparent',
      hover: 'hover:bg-indigo-700',
      active: 'active:bg-indigo-800',
      disabled: 'disabled:bg-gray-400',
      focus: 'focus:ring-indigo-500'
    },
    secondary: {
      base: 'bg-white text-gray-900 border-gray-300',
      hover: 'hover:bg-gray-50',
      active: 'active:bg-gray-100',
      disabled: 'disabled:bg-gray-100 disabled:text-gray-400',
      focus: 'focus:ring-indigo-500'
    },
    success: {
      base: 'bg-green-600 text-white border-transparent',
      hover: 'hover:bg-green-700',
      active: 'active:bg-green-800',
      disabled: 'disabled:bg-gray-400',
      focus: 'focus:ring-green-500'
    },
    danger: {
      base: 'bg-red-600 text-white border-transparent',
      hover: 'hover:bg-red-700',
      active: 'active:bg-red-800',
      disabled: 'disabled:bg-gray-400',
      focus: 'focus:ring-red-500'
    },
    warning: {
      base: 'bg-yellow-600 text-white border-transparent',
      hover: 'hover:bg-yellow-700',
      active: 'active:bg-yellow-800',
      disabled: 'disabled:bg-gray-400',
      focus: 'focus:ring-yellow-500'
    },
    ghost: {
      base: 'bg-transparent text-gray-700 border-transparent',
      hover: 'hover:bg-gray-100',
      active: 'active:bg-gray-200',
      disabled: 'disabled:text-gray-400',
      focus: 'focus:ring-gray-500'
    }
  };

  // Size styles
  const sizeStyles = {
    small: 'px-3 py-2 text-sm min-h-[36px]',
    medium: 'px-4 py-2.5 text-sm min-h-[44px]',
    large: 'px-6 py-3 text-base min-h-[48px]',
    xl: 'px-8 py-4 text-lg min-h-[56px]'
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (disabled || loading) return;

    setIsPressed(true);
    
    // Create ripple effect
    const rect = buttonRef.current?.getBoundingClientRect();
    if (rect && e.touches[0]) {
      const x = e.touches[0].clientX - rect.left;
      const y = e.touches[0].clientY - rect.top;
      const rippleId = ++rippleCounter.current;
      
      setRipples(prev => [...prev, { id: rippleId, x, y }]);
      
      // Remove ripple after animation
      setTimeout(() => {
        setRipples(prev => prev.filter(r => r.id !== rippleId));
      }, 600);
    }

    // Haptic feedback
    if (hapticFeedback !== 'none') {
      impact(hapticFeedback);
    }

    // Long press timer
    if (onLongPress) {
      longPressTimer.current = setTimeout(() => {
        impact('heavy');
        onLongPress();
      }, 500);
    }
  };

  const handleTouchEnd = () => {
    setIsPressed(false);
    
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handleClick = () => {
    if (disabled || loading) return;
    
    if (hapticFeedback !== 'none' && !isPressed) {
      impact(hapticFeedback);
    }
    
    onClick?.();
  };

  const styles = variantStyles[variant];
  
  return (
    <button
      ref={buttonRef}
      type={type}
      onClick={handleClick}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      disabled={disabled || loading}
      aria-label={ariaLabel}
      data-testid={testId}
      className={clsx(
        // Base styles
        'relative overflow-hidden rounded-lg border font-medium transition-all duration-200',
        'focus:outline-none focus:ring-2 focus:ring-offset-2',
        'select-none touch-manipulation',
        
        // Size styles
        sizeStyles[size],
        
        // Variant styles
        styles.base,
        !disabled && !loading && styles.hover,
        !disabled && !loading && styles.active,
        styles.disabled,
        styles.focus,
        
        // Width
        fullWidth && 'w-full',
        
        // Pressed state
        isPressed && !disabled && !loading && 'transform scale-95',
        
        // Disabled state
        (disabled || loading) && 'cursor-not-allowed opacity-60',
        
        className
      )}
    >
      {/* Content */}
      <span className="relative z-10 flex items-center justify-center">
        {loading && (
          <svg
            className="animate-spin -ml-1 mr-3 h-5 w-5 text-current"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {children}
      </span>

      {/* Ripple effects */}
      {ripples.map((ripple) => (
        <span
          key={ripple.id}
          className="absolute pointer-events-none animate-ping"
          style={{
            left: ripple.x - 10,
            top: ripple.y - 10,
            width: 20,
            height: 20,
            borderRadius: '50%',
            backgroundColor: variant === 'ghost' ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.3)',
          }}
        />
      ))}
    </button>
  );
};

export default TouchButton;