import { useState, useCallback, useMemo } from 'react';

export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  email?: boolean;
  phone?: boolean;
  custom?: (value: any) => string | undefined;
}

export interface FieldConfig {
  validation?: ValidationRule;
  initialValue?: any;
}

export interface FormConfig {
  [key: string]: FieldConfig;
}

export interface FormState<T extends Record<string, any>> {
  values: T;
  errors: Partial<Record<keyof T, string>>;
  touched: Partial<Record<keyof T, boolean>>;
  isValid: boolean;
  isDirty: boolean;
}

export interface FormActions<T extends Record<string, any>> {
  setValue: (field: keyof T, value: any) => void;
  setValues: (values: Partial<T>) => void;
  setError: (field: keyof T, error: string) => void;
  clearError: (field: keyof T) => void;
  setTouched: (field: keyof T, touched?: boolean) => void;
  validateField: (field: keyof T) => string | undefined;
  validateForm: () => boolean;
  reset: () => void;
  submit: () => T | null;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[\+]?[1-9][\d]{0,15}$/;

function validateValue(value: any, rules: ValidationRule): string | undefined {
  if (rules.required && (!value || (typeof value === 'string' && !value.trim()))) {
    return 'This field is required';
  }

  if (!value) return undefined; // Skip other validations if empty and not required

  const stringValue = String(value);

  if (rules.minLength && stringValue.length < rules.minLength) {
    return `Must be at least ${rules.minLength} characters`;
  }

  if (rules.maxLength && stringValue.length > rules.maxLength) {
    return `Must be no more than ${rules.maxLength} characters`;
  }

  if (rules.email && !EMAIL_REGEX.test(stringValue)) {
    return 'Please enter a valid email address';
  }

  if (rules.phone && !PHONE_REGEX.test(stringValue.replace(/\s/g, ''))) {
    return 'Please enter a valid phone number';
  }

  if (rules.pattern && !rules.pattern.test(stringValue)) {
    return 'Please enter a valid value';
  }

  if (rules.custom) {
    return rules.custom(value);
  }

  return undefined;
}

export function useForm<T extends Record<string, any>>(
  config: FormConfig,
  onSubmit?: (values: T) => void | Promise<void>
): FormState<T> & FormActions<T> {
  const initialValues = useMemo(() => {
    const values = {} as T;
    Object.keys(config).forEach((key) => {
      values[key as keyof T] = config[key].initialValue ?? '';
    });
    return values;
  }, [config]);

  const [values, setValuesState] = useState<T>(initialValues);
  const [errors, setErrorsState] = useState<Partial<Record<keyof T, string>>>({});
  const [touched, setTouchedState] = useState<Partial<Record<keyof T, boolean>>>({});

  const setValue = useCallback((field: keyof T, value: any) => {
    setValuesState(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrorsState(prev => ({ ...prev, [field]: undefined }));
    }
  }, [errors]);

  const setValues = useCallback((newValues: Partial<T>) => {
    setValuesState(prev => ({ ...prev, ...newValues }));
  }, []);

  const setError = useCallback((field: keyof T, error: string) => {
    setErrorsState(prev => ({ ...prev, [field]: error }));
  }, []);

  const clearError = useCallback((field: keyof T) => {
    setErrorsState(prev => ({ ...prev, [field]: undefined }));
  }, []);

  const setTouched = useCallback((field: keyof T, isTouched: boolean = true) => {
    setTouchedState(prev => ({ ...prev, [field]: isTouched }));
  }, []);

  const validateField = useCallback((field: keyof T): string | undefined => {
    const fieldConfig = config[field as string];
    if (!fieldConfig?.validation) return undefined;

    const error = validateValue(values[field], fieldConfig.validation);
    setErrorsState(prev => ({ ...prev, [field]: error }));
    return error;
  }, [config, values]);

  const validateForm = useCallback((): boolean => {
    const newErrors: Partial<Record<keyof T, string>> = {};
    let isValid = true;

    Object.keys(config).forEach((key) => {
      const field = key as keyof T;
      const fieldConfig = config[key];
      
      if (fieldConfig.validation) {
        const error = validateValue(values[field], fieldConfig.validation);
        if (error) {
          newErrors[field] = error;
          isValid = false;
        }
      }
    });

    setErrorsState(newErrors);
    
    // Mark all fields as touched
    const allTouched: Partial<Record<keyof T, boolean>> = {};
    Object.keys(config).forEach((key) => {
      allTouched[key as keyof T] = true;
    });
    setTouchedState(allTouched);

    return isValid;
  }, [config, values]);

  const reset = useCallback(() => {
    setValuesState(initialValues);
    setErrorsState({});
    setTouchedState({});
  }, [initialValues]);

  const submit = useCallback((): T | null => {
    const isValid = validateForm();
    if (isValid) {
      onSubmit?.(values);
      return values;
    }
    return null;
  }, [validateForm, onSubmit, values]);

  // Computed properties
  const isValid = useMemo(() => {
    return Object.keys(errors).every(key => !errors[key as keyof T]);
  }, [errors]);

  const isDirty = useMemo(() => {
    return Object.keys(values).some(key => {
      const field = key as keyof T;
      return values[field] !== initialValues[field];
    });
  }, [values, initialValues]);

  return {
    values,
    errors,
    touched,
    isValid,
    isDirty,
    setValue,
    setValues,
    setError,
    clearError,
    setTouched,
    validateField,
    validateForm,
    reset,
    submit,
  };
}