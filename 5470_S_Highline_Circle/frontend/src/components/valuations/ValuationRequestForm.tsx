import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import clsx from 'clsx';
import {
  DocumentTextIcon,
  CalendarIcon,
  ExclamationTriangleIcon,
  CurrencyDollarIcon,
  UserIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import type { AppraisalRequestData } from '../../types';

interface ValuationRequestFormProps {
  itemId: string;
  itemName?: string;
  onSubmit: (data: AppraisalRequestData) => void;
  onCancel?: () => void;
  isSubmitting?: boolean;
  className?: string;
}

interface FormData extends AppraisalRequestData {
  preferred_completion_date: string;
}

const priorityOptions = [
  { value: 'low', label: 'Low', description: '2-3 weeks', color: 'text-gray-600' },
  { value: 'medium', label: 'Medium', description: '1-2 weeks', color: 'text-blue-600' },
  { value: 'high', label: 'High', description: '3-5 days', color: 'text-orange-600' },
  { value: 'urgent', label: 'Urgent', description: '24-48 hours', color: 'text-red-600' },
];

const purposeOptions = [
  { value: 'insurance', label: 'Insurance Coverage', description: 'For insurance policy purposes' },
  { value: 'sale', label: 'Sale Preparation', description: 'To determine optimal selling price' },
  { value: 'tax', label: 'Tax Assessment', description: 'For tax deduction or estate planning' },
  { value: 'donation', label: 'Charitable Donation', description: 'For donation tax benefits' },
  { value: 'estate', label: 'Estate Planning', description: 'For will or trust documentation' },
  { value: 'legal', label: 'Legal Proceedings', description: 'For divorce, litigation, etc.' },
  { value: 'other', label: 'Other', description: 'Custom purpose' },
];

export const ValuationRequestForm: React.FC<ValuationRequestFormProps> = ({
  itemId,
  itemName,
  onSubmit,
  onCancel,
  isSubmitting = false,
  className,
}) => {
  const [showCustomPurpose, setShowCustomPurpose] = useState(false);
  const [estimatedCost, setEstimatedCost] = useState<number | null>(null);
  
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    setValue,
  } = useForm<FormData>({
    defaultValues: {
      item_id: itemId,
      priority: 'medium',
      purpose: '',
      special_instructions: '',
      preferred_completion_date: '',
    },
  });

  const selectedPriority = watch('priority');
  const selectedPurpose = watch('purpose');

  // Calculate estimated cost based on priority
  React.useEffect(() => {
    const baseCost = 150;
    const multipliers = {
      low: 1,
      medium: 1.2,
      high: 1.5,
      urgent: 2,
    };
    setEstimatedCost(baseCost * multipliers[selectedPriority as keyof typeof multipliers]);
  }, [selectedPriority]);

  React.useEffect(() => {
    setShowCustomPurpose(selectedPurpose === 'other');
  }, [selectedPurpose]);

  const handleFormSubmit = (data: FormData) => {
    const submitData: AppraisalRequestData = {
      ...data,
      preferred_completion_date: data.preferred_completion_date || undefined,
    };
    onSubmit(submitData);
  };

  const minDate = new Date();
  minDate.setDate(minDate.getDate() + 1);
  const maxDate = new Date();
  maxDate.setMonth(maxDate.getMonth() + 3);

  return (
    <div className={clsx('bg-white rounded-lg border border-gray-200', className)}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center">
          <DocumentTextIcon className="h-6 w-6 text-indigo-600 mr-3" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Request Professional Appraisal
            </h3>
            {itemName && (
              <p className="text-sm text-gray-500 mt-1">
                For: <span className="font-medium">{itemName}</span>
              </p>
            )}
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit(handleFormSubmit)} className="p-6 space-y-6">
        {/* Purpose */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Purpose of Appraisal *
          </label>
          <div className="grid grid-cols-1 gap-3">
            {purposeOptions.map((option) => (
              <label
                key={option.value}
                className={clsx(
                  'relative flex items-start p-3 border rounded-lg cursor-pointer hover:border-indigo-300 transition-colors',
                  selectedPurpose === option.value
                    ? 'border-indigo-500 bg-indigo-50'
                    : 'border-gray-200'
                )}
              >
                <input
                  type="radio"
                  {...register('purpose', { required: 'Purpose is required' })}
                  value={option.value}
                  className="sr-only"
                />
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900">
                    {option.label}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {option.description}
                  </div>
                </div>
                {selectedPurpose === option.value && (
                  <div className="ml-3 text-indigo-600">
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </label>
            ))}
          </div>
          {errors.purpose && (
            <p className="mt-2 text-sm text-red-600">{errors.purpose.message}</p>
          )}

          {/* Custom Purpose Input */}
          {showCustomPurpose && (
            <div className="mt-3">
              <label htmlFor="custom_purpose" className="block text-sm font-medium text-gray-700">
                Please specify the purpose
              </label>
              <input
                type="text"
                id="custom_purpose"
                {...register('purpose', { required: showCustomPurpose ? 'Custom purpose is required' : false })}
                placeholder="Describe the purpose of this appraisal..."
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>
          )}
        </div>

        {/* Priority */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Priority Level *
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {priorityOptions.map((option) => (
              <label
                key={option.value}
                className={clsx(
                  'relative flex flex-col items-center p-3 border rounded-lg cursor-pointer hover:border-indigo-300 transition-colors',
                  selectedPriority === option.value
                    ? 'border-indigo-500 bg-indigo-50'
                    : 'border-gray-200'
                )}
              >
                <input
                  type="radio"
                  {...register('priority', { required: 'Priority is required' })}
                  value={option.value}
                  className="sr-only"
                />
                <ClockIcon className={clsx('h-6 w-6 mb-2', option.color)} />
                <div className="text-sm font-medium text-gray-900 text-center">
                  {option.label}
                </div>
                <div className="text-xs text-gray-500 text-center mt-1">
                  {option.description}
                </div>
              </label>
            ))}
          </div>
          {errors.priority && (
            <p className="mt-2 text-sm text-red-600">{errors.priority.message}</p>
          )}
        </div>

        {/* Preferred Completion Date */}
        <div>
          <label htmlFor="preferred_completion_date" className="block text-sm font-medium text-gray-700">
            <CalendarIcon className="inline h-4 w-4 mr-1" />
            Preferred Completion Date (Optional)
          </label>
          <input
            type="date"
            id="preferred_completion_date"
            {...register('preferred_completion_date')}
            min={minDate.toISOString().split('T')[0]}
            max={maxDate.toISOString().split('T')[0]}
            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
          <p className="mt-1 text-sm text-gray-500">
            Leave blank to use standard timeline for selected priority
          </p>
        </div>

        {/* Special Instructions */}
        <div>
          <label htmlFor="special_instructions" className="block text-sm font-medium text-gray-700">
            Special Instructions (Optional)
          </label>
          <textarea
            id="special_instructions"
            {...register('special_instructions')}
            rows={4}
            placeholder="Any specific requirements, concerns, or additional information..."
            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
          <p className="mt-1 text-sm text-gray-500">
            Include any specific concerns, damage to note, or particular aspects you want emphasized
          </p>
        </div>

        {/* Cost Estimate */}
        {estimatedCost && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center">
              <CurrencyDollarIcon className="h-5 w-5 text-blue-600 mr-2" />
              <div>
                <div className="text-sm font-medium text-blue-900">
                  Estimated Cost: ${estimatedCost.toFixed(0)}
                </div>
                <div className="text-xs text-blue-700">
                  Based on {priorityOptions.find(p => p.value === selectedPriority)?.label.toLowerCase()} priority level
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Important Notice */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex">
            <ExclamationTriangleIcon className="h-5 w-5 text-amber-400 mr-3 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-amber-800">Important Notes</h4>
              <ul className="mt-2 text-sm text-amber-700 space-y-1">
                <li>• Professional appraisals are performed by certified appraisers</li>
                <li>• Final cost may vary based on complexity and additional research required</li>
                <li>• You'll receive a detailed written report suitable for your specified purpose</li>
                <li>• Rush orders may incur additional fees</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end space-x-3 pt-6 border-t border-gray-200">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Submitting...
              </>
            ) : (
              <>
                <UserIcon className="h-4 w-4 mr-2" />
                Request Appraisal
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ValuationRequestForm;