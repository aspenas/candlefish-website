import React, { useState, useRef, ReactNode } from 'react';
import { animated, useSpring } from '@react-spring/web';
import { useDrag } from '@use-gesture/react';
import { useHapticFeedback } from '../../hooks/useMobileGestures';
import clsx from 'clsx';

export interface SwipeableCardProps {
  id: string;
  children: ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onTap?: () => void;
  leftAction?: {
    icon: ReactNode;
    color: string;
    label: string;
  };
  rightAction?: {
    icon: ReactNode;
    color: string;
    label: string;
  };
  disabled?: boolean;
  className?: string;
}

const SwipeableCard: React.FC<SwipeableCardProps> = ({
  id,
  children,
  onSwipeLeft,
  onSwipeRight,
  onTap,
  leftAction,
  rightAction,
  disabled = false,
  className = ''
}) => {
  const [swiped, setSwiped] = useState(false);
  const { impact } = useHapticFeedback();

  const [{ x, opacity, scale }, api] = useSpring(() => ({
    x: 0,
    opacity: 1,
    scale: 1,
    config: { tension: 500, friction: 30 }
  }));

  const bind = useDrag(
    ({ active, movement: [mx], direction: [xDir], velocity: [vx], cancel }) => {
      if (disabled || swiped) return;

      const trigger = Math.abs(mx) > 100; // Threshold for action
      const isLeft = xDir < 0;
      const isRight = xDir > 0;

      // Determine if we should trigger an action
      if (active) {
        // During drag, show preview of action
        api.start({
          x: mx,
          scale: 1 + Math.abs(mx) * 0.0005,
          opacity: 1 - Math.abs(mx) * 0.002,
          immediate: true
        });

        // Haptic feedback when reaching threshold
        if (Math.abs(mx) > 100 && !swiped) {
          if (isLeft && leftAction) {
            impact('medium');
          } else if (isRight && rightAction) {
            impact('medium');
          }
        }
      } else {
        // On release
        if (trigger && Math.abs(vx) > 0.2) {
          if (isLeft && leftAction && onSwipeLeft) {
            // Swipe left action
            impact('heavy');
            api.start({
              x: -window.innerWidth,
              opacity: 0,
              scale: 0.8,
              config: { tension: 300, friction: 30 }
            });
            setSwiped(true);
            setTimeout(() => onSwipeLeft(), 300);
            cancel();
          } else if (isRight && rightAction && onSwipeRight) {
            // Swipe right action
            impact('heavy');
            api.start({
              x: window.innerWidth,
              opacity: 0,
              scale: 0.8,
              config: { tension: 300, friction: 30 }
            });
            setSwiped(true);
            setTimeout(() => onSwipeRight(), 300);
            cancel();
          } else {
            // Snap back
            api.start({ x: 0, opacity: 1, scale: 1 });
          }
        } else {
          // Snap back if threshold not met
          api.start({ x: 0, opacity: 1, scale: 1 });
        }
      }
    },
    {
      axis: 'x',
      rubberband: true,
      filterTaps: true,
      threshold: 10
    }
  );

  const handleTap = () => {
    if (!disabled && onTap && !swiped) {
      impact('light');
      onTap();
    }
  };

  return (
    <div className="relative">
      {/* Action backgrounds */}
      {leftAction && (
        <div 
          className={clsx(
            'absolute inset-0 flex items-center justify-end pr-4 rounded-lg',
            leftAction.color
          )}
        >
          <div className="flex items-center space-x-2 text-white">
            {leftAction.icon}
            <span className="font-medium">{leftAction.label}</span>
          </div>
        </div>
      )}

      {rightAction && (
        <div 
          className={clsx(
            'absolute inset-0 flex items-center justify-start pl-4 rounded-lg',
            rightAction.color
          )}
        >
          <div className="flex items-center space-x-2 text-white">
            {rightAction.icon}
            <span className="font-medium">{rightAction.label}</span>
          </div>
        </div>
      )}

      {/* Main card */}
      <animated.div
        {...bind()}
        onClick={handleTap}
        style={{
          x,
          opacity,
          scale,
          touchAction: 'pan-x'
        }}
        className={clsx(
          'relative z-10 bg-white rounded-lg shadow-sm border border-gray-200',
          'cursor-pointer select-none',
          !disabled && 'hover:shadow-md',
          disabled && 'opacity-60 cursor-not-allowed',
          className
        )}
      >
        {children}
      </animated.div>
    </div>
  );
};

// Swipeable Cards Container
interface SwipeableCardsProps {
  children: ReactNode;
  className?: string;
  spacing?: 'none' | 'small' | 'medium' | 'large';
}

const SwipeableCards: React.FC<SwipeableCardsProps> = ({
  children,
  className = '',
  spacing = 'medium'
}) => {
  const spacingStyles = {
    none: 'space-y-0',
    small: 'space-y-2',
    medium: 'space-y-4',
    large: 'space-y-6'
  };

  return (
    <div className={clsx(
      'w-full',
      spacingStyles[spacing],
      className
    )}>
      {children}
    </div>
  );
};

// Inventory Item Card (example usage)
interface InventoryItemCardProps {
  item: {
    id: string;
    name: string;
    category: string;
    value: number;
    photos: number;
    room: string;
  };
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  onViewPhotos?: (id: string) => void;
}

const InventoryItemCard: React.FC<InventoryItemCardProps> = ({
  item,
  onEdit,
  onDelete,
  onViewPhotos
}) => {
  return (
    <SwipeableCard
      id={item.id}
      onTap={() => onViewPhotos?.(item.id)}
      onSwipeLeft={() => onDelete?.(item.id)}
      onSwipeRight={() => onEdit?.(item.id)}
      leftAction={{
        icon: (
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        ),
        color: 'bg-red-500',
        label: 'Delete'
      }}
      rightAction={{
        icon: (
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        ),
        color: 'bg-blue-500',
        label: 'Edit'
      }}
      className="p-4"
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <h3 className="text-lg font-medium text-gray-900 mb-1">
            {item.name}
          </h3>
          <div className="flex items-center space-x-4 text-sm text-gray-500">
            <span className="flex items-center">
              📂 {item.category}
            </span>
            <span className="flex items-center">
              🏠 {item.room}
            </span>
            <span className="flex items-center">
              📸 {item.photos}
            </span>
          </div>
        </div>
        
        <div className="text-right">
          <div className="text-lg font-semibold text-gray-900">
            ${item.value.toLocaleString()}
          </div>
        </div>
      </div>
    </SwipeableCard>
  );
};

export default SwipeableCards;
export { SwipeableCard, InventoryItemCard };