import React, { useState } from 'react';
import { InterestLevel, UserRole } from '../types';
import { api } from '../services/api';

interface BuyerInterestBadgeProps {
  itemId: string;
  currentLevel?: InterestLevel;
  maxPrice?: number;
  userRole: UserRole;
  onUpdate?: (level: InterestLevel) => void;
  compact?: boolean;
}

const BuyerInterestBadge: React.FC<BuyerInterestBadgeProps> = ({
  itemId,
  currentLevel = 'none',
  maxPrice,
  userRole,
  onUpdate,
  compact = false
}) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [updating, setUpdating] = useState(false);

  // Interest level configurations
  const interestConfig = {
    high: {
      color: 'text-red-700',
      bg: 'bg-red-100 hover:bg-red-200',
      border: 'border-red-300',
      icon: '🔥',
      label: 'High'
    },
    medium: {
      color: 'text-yellow-700',
      bg: 'bg-yellow-100 hover:bg-yellow-200',
      border: 'border-yellow-300',
      icon: '💫',
      label: 'Medium'
    },
    low: {
      color: 'text-blue-700',
      bg: 'bg-blue-100 hover:bg-blue-200',
      border: 'border-blue-300',
      icon: '💭',
      label: 'Low'
    },
    none: {
      color: 'text-gray-700',
      bg: 'bg-gray-100 hover:bg-gray-200',
      border: 'border-gray-300',
      icon: '⭕',
      label: 'None'
    }
  };

  const handleLevelUpdate = async (newLevel: InterestLevel) => {
    if (userRole !== 'buyer') return;

    setUpdating(true);
    try {
      await api.setItemInterest(itemId, {
        interest_level: newLevel,
        max_price: maxPrice,
        notes: undefined
      });

      onUpdate?.(newLevel);
      setShowDropdown(false);
    } catch (error) {
      console.error('Failed to update interest level:', error);
    } finally {
      setUpdating(false);
    }
  };

  const config = interestConfig[currentLevel];

  if (currentLevel === 'none' && userRole === 'owner') {
    return null; // Don't show badge for owner when no interest
  }

  return (
    <div className="relative inline-block">
      <div
        className={`
          inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium cursor-pointer transition-all
          border ${config.border} ${config.bg} ${config.color}
          ${userRole === 'buyer' ? 'hover:shadow-sm' : 'cursor-default'}
          ${compact ? 'px-2 py-0.5' : ''}
        `}
        onClick={() => {
          if (userRole === 'buyer') {
            setShowDropdown(!showDropdown);
          }
        }}
        title={userRole === 'buyer' ? 'Click to change interest level' : undefined}
      >
        <span className="text-sm">{config.icon}</span>
        <span className={compact ? 'sr-only' : ''}>{config.label}</span>
        {maxPrice && !compact && (
          <span className="ml-1 opacity-75">
            (${maxPrice.toLocaleString()})
          </span>
        )}
        {userRole === 'buyer' && (
          <svg
            className="w-3 h-3 ml-1"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        )}
      </div>

      {/* Dropdown for buyer */}
      {showDropdown && userRole === 'buyer' && (
        <div className="absolute z-10 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg">
          <div className="p-2">
            <div className="text-xs font-medium text-gray-700 mb-2">
              Set Interest Level
            </div>
            {Object.entries(interestConfig).map(([level, levelConfig]) => (
              <button
                key={level}
                onClick={() => handleLevelUpdate(level as InterestLevel)}
                disabled={updating}
                className={`
                  w-full flex items-center gap-2 px-3 py-2 text-left text-sm rounded hover:bg-gray-50 disabled:opacity-50
                  ${currentLevel === level ? 'bg-gray-100' : ''}
                `}
              >
                <span>{levelConfig.icon}</span>
                <span>{levelConfig.label} Interest</span>
                {currentLevel === level && (
                  <svg className="w-4 h-4 ml-auto text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            ))}
          </div>

          {currentLevel !== 'none' && (
            <div className="border-t border-gray-100 p-2">
              <div className="text-xs text-gray-600 mb-1">
                Max Price (optional)
              </div>
              <input
                type="number"
                placeholder="Enter max price"
                className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                defaultValue={maxPrice}
                onBlur={(e) => {
                  const newMaxPrice = e.target.value ? parseFloat(e.target.value) : undefined;
                  if (newMaxPrice !== maxPrice) {
                    handleLevelUpdate(currentLevel);
                  }
                }}
              />
            </div>
          )}
        </div>
      )}

      {/* Click outside to close dropdown */}
      {showDropdown && (
        <div
          className="fixed inset-0 z-5"
          onClick={() => setShowDropdown(false)}
        />
      )}
    </div>
  );
};

export default BuyerInterestBadge;
