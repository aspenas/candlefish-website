import React from 'react';
import { cn } from '../../lib/utils';

interface SliderProps {
  value: number[];
  onValueChange: (value: number[]) => void;
  max: number;
  min: number;
  step: number;
  className?: string;
}

export const Slider: React.FC<SliderProps> = ({
  value,
  onValueChange,
  max,
  min,
  step,
  className
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onValueChange([parseFloat(e.target.value)]);
  };

  const percentage = ((value[0] - min) / (max - min)) * 100;

  return (
    <div className={cn('relative w-full', className)}>
      <div className="relative h-6 flex items-center">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full h-2 bg-gray-700 rounded-full">
            <div 
              className="h-2 bg-blue-600 rounded-full"
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value[0]}
          onChange={handleChange}
          className="relative w-full h-6 bg-transparent appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 slider"
        />
      </div>
      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #3B82F6;
          cursor: pointer;
          border: 2px solid #1F2937;
        }
        .slider::-moz-range-thumb {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #3B82F6;
          cursor: pointer;
          border: 2px solid #1F2937;
        }
      `}</style>
    </div>
  );
};