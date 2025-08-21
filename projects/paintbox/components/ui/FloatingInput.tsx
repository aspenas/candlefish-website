import React from 'react';
import { cn } from '@/lib/utils';

interface FloatingInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  icon?: React.ReactNode;
  required?: boolean;
}

export const FloatingInput: React.FC<FloatingInputProps> = ({
  label,
  error,
  icon,
  required = false,
  className,
  ...props
}) => {
  return (
    <div className="relative">
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
            {icon}
          </div>
        )}
        <input
          {...props}
          className={cn(
            "w-full px-3 py-2 border rounded-md peer transition-all",
            "focus:ring-2 focus:ring-purple-500 focus:border-purple-500",
            "placeholder-transparent",
            icon && "pl-10",
            error ? "border-red-500" : "border-gray-300",
            "hover:border-gray-400",
            className
          )}
          placeholder=" "
        />
        <label className={cn(
          "absolute bg-white px-1 text-sm transition-all pointer-events-none",
          "peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-500",
          "peer-focus:text-sm peer-focus:text-purple-600",
          icon ? "left-8 peer-placeholder-shown:left-10" : "left-3 peer-placeholder-shown:left-3",
          "top-0 -translate-y-1/2",
          "peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2",
          "peer-focus:top-0 peer-focus:-translate-y-1/2",
          error ? "text-red-600" : "text-gray-600"
        )}>
          {label}{required && ' *'}
        </label>
      </div>
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
};
