import React from 'react';
import { SunIcon, MoonIcon } from '@heroicons/react/24/outline';
import { useTheme } from '../contexts/ThemeContext';

interface ThemeToggleProps {
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export default function ThemeToggle({ showLabel = false, size = 'md' }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6',
  };

  const buttonSizeClasses = {
    sm: 'p-1',
    md: 'p-1.5',
    lg: 'p-2',
  };

  return (
    <div className="flex items-center">
      <button
        onClick={toggleTheme}
        className={`
          ${buttonSizeClasses[size]}
          rounded-lg transition-colors duration-200
          bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700
          text-gray-700 dark:text-gray-300
          focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2
          dark:focus:ring-offset-gray-900
        `}
        title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      >
        {isDark ? (
          <SunIcon className={`${sizeClasses[size]} text-yellow-500`} />
        ) : (
          <MoonIcon className={`${sizeClasses[size]} text-indigo-500`} />
        )}
      </button>
      {showLabel && (
        <span className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">
          {isDark ? 'Light mode' : 'Dark mode'}
        </span>
      )}
    </div>
  );
}

interface ThemeToggleSwitchProps {
  label?: string;
  description?: string;
}

export function ThemeToggleSwitch({ label = 'Dark mode', description }: ThemeToggleSwitchProps) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <div className="flex items-center justify-between">
      <div className="flex-1">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </label>
        {description && (
          <p className="text-sm text-gray-500 dark:text-gray-400">{description}</p>
        )}
      </div>
      <button
        type="button"
        onClick={toggleTheme}
        className={`
          relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200
          focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2
          dark:focus:ring-offset-gray-900
          ${isDark ? 'bg-indigo-600' : 'bg-gray-200'}
        `}
        role="switch"
        aria-checked={isDark}
        aria-label={`Toggle ${label.toLowerCase()}`}
      >
        <span
          className={`
            inline-block h-4 w-4 rounded-full bg-white shadow-lg transform transition-transform duration-200
            ${isDark ? 'translate-x-6' : 'translate-x-1'}
          `}
        />
      </button>
    </div>
  );
}
