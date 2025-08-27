import React, { useState } from 'react';
import { cn } from '../../lib/utils';

interface TooltipProps {
  children: React.ReactNode;
  content: string;
  className?: string;
}

export const Tooltip: React.FC<TooltipProps> = ({ 
  children, 
  content, 
  className 
}) => {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div
      className="relative inline-block"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}
      {isVisible && (
        <div
          className={cn(
            'absolute z-50 px-2 py-1 text-sm text-white bg-gray-900 rounded-md shadow-lg border border-gray-700 whitespace-nowrap',
            'bottom-full left-1/2 transform -translate-x-1/2 -translate-y-1',
            className
          )}
        >
          {content}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2">
            <div className="border-4 border-transparent border-t-gray-900" />
          </div>
        </div>
      )}
    </div>
  );
};