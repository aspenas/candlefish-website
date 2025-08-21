import React, { useState } from 'react';
import { ChevronDown, User, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EstimatorValue {
  name: string;
  email: string;
  phone: string;
}

interface EstimatorOption {
  value: string;
  label: string;
  description: string;
}

interface EstimatorDropdownProps {
  value: EstimatorValue;
  onChange: (estimator: EstimatorValue) => void;
  error?: string;
  required?: boolean;
  className?: string;
}

const ESTIMATOR_OPTIONS: EstimatorOption[] = [
  {
    value: "john-martinez",
    label: "John Martinez",
    description: "john.martinez@paintbox.com • 555-0101",
  },
  {
    value: "sarah-johnson",
    label: "Sarah Johnson",
    description: "sarah.johnson@paintbox.com • 555-0102",
  },
  {
    value: "michael-chen",
    label: "Michael Chen",
    description: "michael.chen@paintbox.com • 555-0103",
  },
  {
    value: "emily-rodriguez",
    label: "Emily Rodriguez",
    description: "emily.rodriguez@paintbox.com • 555-0104",
  },
  {
    value: "david-thompson",
    label: "David Thompson",
    description: "david.thompson@paintbox.com • 555-0105",
  }
];

const ESTIMATOR_DATA: Record<string, { email: string; phone: string }> = {
  "john-martinez": { email: "john.martinez@paintbox.com", phone: "555-0101" },
  "sarah-johnson": { email: "sarah.johnson@paintbox.com", phone: "555-0102" },
  "michael-chen": { email: "michael.chen@paintbox.com", phone: "555-0103" },
  "emily-rodriguez": { email: "emily.rodriguez@paintbox.com", phone: "555-0104" },
  "david-thompson": { email: "david.thompson@paintbox.com", phone: "555-0105" },
};

export const EstimatorDropdown: React.FC<EstimatorDropdownProps> = ({
  value,
  onChange,
  error,
  required = false,
  className
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedEstimator, setSelectedEstimator] = useState(value.name);

  const handleSelect = (estimatorValue: string) => {
    const estimatorData = ESTIMATOR_DATA[estimatorValue];
    const estimatorOption = ESTIMATOR_OPTIONS.find(opt => opt.value === estimatorValue);
    
    if (estimatorData && estimatorOption) {
      setSelectedEstimator(estimatorOption.label);
      onChange({
        name: estimatorOption.label,
        email: estimatorData.email,
        phone: estimatorData.phone
      });
    }
    setIsOpen(false);
  };

  const selectedOption = ESTIMATOR_OPTIONS.find(opt => opt.label === value.name);

  return (
    <div className={cn("relative", className)}>
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "w-full px-3 py-2 pr-10 text-left bg-white border rounded-md shadow-sm transition-all",
            "focus:ring-2 focus:ring-purple-500 focus:border-purple-500",
            error ? "border-red-500" : "border-gray-300",
            "hover:border-gray-400"
          )}
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
              <User className="w-4 h-4 text-purple-600" />
            </div>
            <div className="flex-1 min-w-0">
              {value.name ? (
                <>
                  <p className="font-medium text-gray-900">{value.name}</p>
                  <p className="text-sm text-gray-500 truncate">{value.email}</p>
                </>
              ) : (
                <p className="text-gray-500">Select estimator{required && ' *'}</p>
              )}
            </div>
          </div>
          <ChevronDown className={cn(
            "absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 transition-transform",
            isOpen && "rotate-180"
          )} />
        </button>

        {isOpen && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
            {ESTIMATOR_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => handleSelect(option.value)}
                className={cn(
                  "w-full px-3 py-3 text-left hover:bg-gray-50 transition-colors",
                  "border-b border-gray-100 last:border-b-0",
                  selectedOption?.value === option.value && "bg-purple-50"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                    <User className="w-4 h-4 text-purple-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-900">{option.label}</p>
                      {selectedOption?.value === option.value && (
                        <Check className="w-4 h-4 text-purple-600" />
                      )}
                    </div>
                    <p className="text-sm text-gray-500">{option.description}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
};
