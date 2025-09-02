'use client';

import React, { useState } from 'react';
import { useAnalyticsStore, Widget } from '../../../stores/analyticsStore';
import { 
  MoreVertical,
  Maximize2,
  Minimize2,
  Settings,
  X,
  Move
} from 'lucide-react';
import { cn } from '../../../lib/utils';

interface WidgetContainerProps {
  widget: Widget;
  children: React.ReactNode;
  onSelect?: () => void;
  isSelected?: boolean;
  className?: string;
}

const WidgetContainer: React.FC<WidgetContainerProps> = ({
  widget,
  children,
  onSelect,
  isSelected = false,
  className,
}) => {
  const { updateWidget, removeWidget } = useAnalyticsStore();
  const [showMenu, setShowMenu] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);

  const handleMaximize = () => {
    setIsMaximized(!isMaximized);
    // In a full implementation, this would update the widget's position
    // to take up the full dashboard area
  };

  const handleSettings = () => {
    // Open widget settings modal
    console.log('Open settings for widget:', widget.id);
  };

  const handleRemove = () => {
    if (confirm('Are you sure you want to remove this widget?')) {
      removeWidget(widget.id);
    }
  };

  const handleToggleVisibility = () => {
    updateWidget(widget.id, { visible: !widget.visible });
  };

  return (
    <div
      className={cn(
        'bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden transition-all duration-200 hover:shadow-md',
        isSelected && 'ring-2 ring-blue-500 ring-opacity-50',
        isMaximized && 'fixed inset-4 z-50 shadow-2xl',
        className
      )}
      onClick={onSelect}
    >
      {/* Widget Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
        <div className="flex items-center space-x-2">
          <Move className="h-4 w-4 text-gray-400 cursor-move" />
          <h3 className="font-semibold text-gray-900">{widget.title}</h3>
        </div>

        <div className="flex items-center space-x-1">
          {/* Maximize/Minimize Button */}
          <button
            onClick={handleMaximize}
            className="p-1 rounded-md hover:bg-gray-200 transition-colors"
            title={isMaximized ? 'Minimize' : 'Maximize'}
          >
            {isMaximized ? (
              <Minimize2 className="h-4 w-4 text-gray-600" />
            ) : (
              <Maximize2 className="h-4 w-4 text-gray-600" />
            )}
          </button>

          {/* Widget Menu */}
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(!showMenu);
              }}
              className="p-1 rounded-md hover:bg-gray-200 transition-colors"
            >
              <MoreVertical className="h-4 w-4 text-gray-600" />
            </button>

            {showMenu && (
              <div className="absolute right-0 mt-1 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-10">
                <div className="py-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSettings();
                      setShowMenu(false);
                    }}
                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Settings
                  </button>
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleVisibility();
                      setShowMenu(false);
                    }}
                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    {widget.visible ? 'Hide Widget' : 'Show Widget'}
                  </button>

                  <div className="border-t border-gray-100 my-1" />
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemove();
                      setShowMenu(false);
                    }}
                    className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Remove Widget
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Widget Content */}
      <div className="p-4 h-full">
        {children}
      </div>

      {/* Click outside handler for menu */}
      {showMenu && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setShowMenu(false)}
        />
      )}
    </div>
  );
};

export default WidgetContainer;