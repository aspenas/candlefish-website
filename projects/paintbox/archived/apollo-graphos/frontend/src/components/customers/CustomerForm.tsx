import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation } from '@apollo/client';
import { X } from 'lucide-react';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { CREATE_CUSTOMER, UPDATE_CUSTOMER, SEARCH_CUSTOMERS } from '@/graphql/customers';
import { useFormState, useFormActions } from '@/store';
import type { CustomerFormData, CustomerStatus } from '@/types/graphql';
import toast from 'react-hot-toast';

const CustomerForm: React.FC = () => {
  const { customerForm } = useFormState();
  const { closeCustomerForm, setCustomerFormErrors } = useFormActions();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
    watch,
  } = useForm<CustomerFormData>({
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      address: {
        street: '',
        city: '',
        state: '',
        zipCode: '',
        country: 'US',
      },
      notes: '',
    },
  });

  const [createCustomer] = useMutation(CREATE_CUSTOMER, {
    refetchQueries: [{ query: SEARCH_CUSTOMERS }],
    onCompleted: () => {
      toast.success('Customer created successfully');
      closeCustomerForm();
      reset();
    },
    onError: (error) => {
      toast.error('Failed to create customer');
      console.error('Create customer error:', error);
    },
  });

  const [updateCustomer] = useMutation(UPDATE_CUSTOMER, {
    refetchQueries: [{ query: SEARCH_CUSTOMERS }],
    onCompleted: () => {
      toast.success('Customer updated successfully');
      closeCustomerForm();
      reset();
    },
    onError: (error) => {
      toast.error('Failed to update customer');
      console.error('Update customer error:', error);
    },
  });

  // Reset form when opening/closing or data changes
  useEffect(() => {
    if (customerForm.isOpen && customerForm.data) {
      reset({
        name: customerForm.data.name || '',
        email: customerForm.data.email || '',
        phone: customerForm.data.phone || '',
        address: {
          street: customerForm.data.address?.street || '',
          city: customerForm.data.address?.city || '',
          state: customerForm.data.address?.state || '',
          zipCode: customerForm.data.address?.zipCode || '',
          country: customerForm.data.address?.country || 'US',
        },
        notes: customerForm.data.notes || '',
      });
    } else if (!customerForm.isOpen) {
      reset();
    }
  }, [customerForm.isOpen, customerForm.data, reset]);

  const onSubmit = async (data: CustomerFormData) => {
    try {
      setCustomerFormErrors({});

      if (customerForm.mode === 'create') {
        await createCustomer({
          variables: {
            input: {
              name: data.name,
              email: data.email || undefined,
              phone: data.phone || undefined,
              address: data.address?.street ? data.address : undefined,
              notes: data.notes || undefined,
            },
          },
        });
      } else {
        await updateCustomer({
          variables: {
            id: customerForm.data.id,
            input: {
              name: data.name,
              email: data.email || undefined,
              phone: data.phone || undefined,
              address: data.address?.street ? data.address : undefined,
              notes: data.notes || undefined,
            },
          },
        });
      }
    } catch (error) {
      console.error('Form submission error:', error);
    }
  };

  const handleClose = () => {
    closeCustomerForm();
    reset();
  };

  if (!customerForm.isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <Card>
          <CardHeader
            title={customerForm.mode === 'create' ? 'Add New Customer' : 'Edit Customer'}
            actions={
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClose}
                disabled={isSubmitting}
              >
                <X className="w-4 h-4" />
              </Button>
            }
          />

          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Basic Information */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Basic Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Customer Name *"
                    {...register('name', {
                      required: 'Customer name is required',
                      minLength: {
                        value: 2,
                        message: 'Name must be at least 2 characters',
                      },
                    })}
                    error={errors.name?.message}
                    disabled={isSubmitting}
                    fullWidth
                  />

                  <Input
                    label="Email"
                    type="email"
                    {...register('email', {
                      pattern: {
                        value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                        message: 'Invalid email address',
                      },
                    })}
                    error={errors.email?.message}
                    disabled={isSubmitting}
                    fullWidth
                  />

                  <Input
                    label="Phone"
                    type="tel"
                    {...register('phone')}
                    error={errors.phone?.message}
                    disabled={isSubmitting}
                    fullWidth
                  />
                </div>
              </div>

              {/* Address */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Address
                </h3>
                <div className="space-y-4">
                  <Input
                    label="Street Address"
                    {...register('address.street')}
                    error={errors.address?.street?.message}
                    disabled={isSubmitting}
                    fullWidth
                  />

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Input
                      label="City"
                      {...register('address.city')}
                      error={errors.address?.city?.message}
                      disabled={isSubmitting}
                      fullWidth
                    />

                    <Input
                      label="State"
                      {...register('address.state')}
                      error={errors.address?.state?.message}
                      disabled={isSubmitting}
                      fullWidth
                    />

                    <Input
                      label="ZIP Code"
                      {...register('address.zipCode')}
                      error={errors.address?.zipCode?.message}
                      disabled={isSubmitting}
                      fullWidth
                    />
                  </div>

                  <Input
                    label="Country"
                    {...register('address.country')}
                    error={errors.address?.country?.message}
                    disabled={isSubmitting}
                    fullWidth
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Additional Information
                </h3>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes
                  </label>
                  <textarea
                    {...register('notes')}
                    rows={4}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed transition-colors"
                    placeholder="Additional notes about this customer..."
                    disabled={isSubmitting}
                  />
                  {errors.notes && (
                    <p className="mt-1 text-sm text-error-600">{errors.notes.message}</p>
                  )}
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  loading={isSubmitting}
                >
                  {customerForm.mode === 'create' ? 'Create Customer' : 'Update Customer'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CustomerForm;
