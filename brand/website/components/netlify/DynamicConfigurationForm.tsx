'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { Extension, ExtensionConfig } from '../../types/netlify';
import { cn } from '../../utils/cn';

interface ConfigSchema {
  type: 'string' | 'number' | 'boolean' | 'select' | 'multiselect' | 'object' | 'array' | 'json' | 'url' | 'color';
  label: string;
  description?: string;
  required?: boolean;
  default?: any;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    message?: string;
  };
  options?: Array<{ value: any; label: string; description?: string }>;
  properties?: Record<string, ConfigSchema>; // for object types
  items?: ConfigSchema; // for array types
  conditional?: {
    field: string;
    value: any;
    operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than';
  };
  group?: string;
  advanced?: boolean;
  placeholder?: string;
  helpText?: string;
}

interface ConfigFormData {
  [key: string]: any;
}

interface ValidationError {
  field: string;
  message: string;
}

interface DynamicConfigurationFormProps {
  extension: Extension;
  initialConfig?: ExtensionConfig;
  onSave: (config: ConfigFormData) => Promise<void>;
  onCancel: () => void;
  isOpen: boolean;
  loading?: boolean;
  className?: string;
}

// Mock configuration schemas for different extension types
const getConfigurationSchema = (extension: Extension): Record<string, ConfigSchema> => {
  const baseSchemas: Record<string, Record<string, ConfigSchema>> = {
    performance: {
      cacheStrategy: {
        type: 'select',
        label: 'Cache Strategy',
        description: 'How should content be cached?',
        required: true,
        default: 'intelligent',
        options: [
          { value: 'aggressive', label: 'Aggressive', description: 'Cache everything for maximum performance' },
          { value: 'intelligent', label: 'Intelligent', description: 'Smart caching based on content type' },
          { value: 'conservative', label: 'Conservative', description: 'Minimal caching for dynamic content' }
        ],
        group: 'caching'
      },
      cacheTTL: {
        type: 'number',
        label: 'Cache TTL (seconds)',
        description: 'How long to cache content',
        required: false,
        default: 3600,
        validation: { min: 60, max: 86400, message: 'TTL must be between 1 minute and 24 hours' },
        group: 'caching'
      },
      enableCompression: {
        type: 'boolean',
        label: 'Enable Compression',
        description: 'Compress assets for faster delivery',
        default: true,
        group: 'optimization'
      },
      compressionLevel: {
        type: 'select',
        label: 'Compression Level',
        description: 'How aggressively to compress assets',
        default: 'standard',
        options: [
          { value: 'light', label: 'Light', description: 'Minimal compression' },
          { value: 'standard', label: 'Standard', description: 'Balanced compression' },
          { value: 'aggressive', label: 'Aggressive', description: 'Maximum compression' }
        ],
        conditional: { field: 'enableCompression', value: true, operator: 'equals' },
        group: 'optimization'
      },
      excludePatterns: {
        type: 'array',
        label: 'Exclude Patterns',
        description: 'URL patterns to exclude from optimization',
        items: { type: 'string', placeholder: '/api/*' },
        group: 'optimization',
        advanced: true
      }
    },
    security: {
      enableCSP: {
        type: 'boolean',
        label: 'Enable Content Security Policy',
        description: 'Add CSP headers for enhanced security',
        default: true,
        group: 'headers'
      },
      cspDirectives: {
        type: 'object',
        label: 'CSP Directives',
        description: 'Custom Content Security Policy directives',
        properties: {
          'default-src': { type: 'string', label: 'Default Source', placeholder: "'self'" },
          'script-src': { type: 'string', label: 'Script Sources', placeholder: "'self' 'unsafe-inline'" },
          'style-src': { type: 'string', label: 'Style Sources', placeholder: "'self' 'unsafe-inline'" },
          'img-src': { type: 'string', label: 'Image Sources', placeholder: "'self' data: https:" }
        },
        conditional: { field: 'enableCSP', value: true, operator: 'equals' },
        group: 'headers',
        advanced: true
      },
      enableHSTS: {
        type: 'boolean',
        label: 'Enable HSTS',
        description: 'Force HTTPS with HTTP Strict Transport Security',
        default: true,
        group: 'headers'
      },
      hstsMaxAge: {
        type: 'number',
        label: 'HSTS Max Age (seconds)',
        description: 'How long browsers should remember HTTPS requirement',
        default: 31536000,
        validation: { min: 86400, max: 63072000, message: 'Max age must be between 1 day and 2 years' },
        conditional: { field: 'enableHSTS', value: true, operator: 'equals' },
        group: 'headers'
      },
      allowedDomains: {
        type: 'array',
        label: 'Allowed Domains',
        description: 'Domains allowed to embed this site',
        items: { type: 'url', placeholder: 'https://example.com' },
        group: 'access',
        advanced: true
      }
    },
    analytics: {
      trackingId: {
        type: 'string',
        label: 'Tracking ID',
        description: 'Your analytics tracking identifier',
        required: true,
        placeholder: 'G-XXXXXXXXXX',
        validation: { pattern: '^(G-|UA-|GTM-)', message: 'Must be a valid tracking ID' },
        group: 'tracking'
      },
      enableEnhancedEcommerce: {
        type: 'boolean',
        label: 'Enhanced E-commerce',
        description: 'Track e-commerce events',
        default: false,
        group: 'tracking'
      },
      customDimensions: {
        type: 'array',
        label: 'Custom Dimensions',
        description: 'Additional data to track',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string', label: 'Name', required: true },
            value: { type: 'string', label: 'Value', required: true }
          }
        },
        group: 'tracking',
        advanced: true
      },
      excludePages: {
        type: 'array',
        label: 'Exclude Pages',
        description: 'Pages to exclude from tracking',
        items: { type: 'string', placeholder: '/admin/*' },
        group: 'privacy',
        advanced: true
      },
      respectDNT: {
        type: 'boolean',
        label: 'Respect Do Not Track',
        description: 'Honor browser Do Not Track settings',
        default: true,
        group: 'privacy'
      }
    },
    seo: {
      sitemapUrl: {
        type: 'url',
        label: 'Sitemap URL',
        description: 'URL to your XML sitemap',
        placeholder: 'https://example.com/sitemap.xml',
        group: 'indexing'
      },
      enableStructuredData: {
        type: 'boolean',
        label: 'Enable Structured Data',
        description: 'Add JSON-LD structured data',
        default: true,
        group: 'markup'
      },
      defaultMetaTags: {
        type: 'object',
        label: 'Default Meta Tags',
        description: 'Default meta tags for pages',
        properties: {
          title: { type: 'string', label: 'Default Title', placeholder: 'Your Site Name' },
          description: { type: 'string', label: 'Default Description', placeholder: 'Your site description' },
          keywords: { type: 'string', label: 'Default Keywords', placeholder: 'keyword1, keyword2' }
        },
        group: 'markup'
      },
      enableOpenGraph: {
        type: 'boolean',
        label: 'Enable Open Graph',
        description: 'Add Open Graph tags for social sharing',
        default: true,
        group: 'social'
      },
      socialDefaults: {
        type: 'object',
        label: 'Social Defaults',
        description: 'Default social media settings',
        properties: {
          ogImage: { type: 'url', label: 'Default OG Image', placeholder: 'https://example.com/og-image.png' },
          twitterCard: {
            type: 'select',
            label: 'Twitter Card Type',
            options: [
              { value: 'summary', label: 'Summary' },
              { value: 'summary_large_image', label: 'Summary Large Image' }
            ],
            default: 'summary_large_image'
          }
        },
        conditional: { field: 'enableOpenGraph', value: true, operator: 'equals' },
        group: 'social'
      }
    }
  };

  // Return schema based on extension category, with fallback to generic schema
  return baseSchemas[extension.category] || {
    enabled: {
      type: 'boolean',
      label: 'Enable Extension',
      description: 'Whether this extension should be active',
      default: true,
      group: 'general'
    },
    configuration: {
      type: 'json',
      label: 'Configuration JSON',
      description: 'Custom configuration in JSON format',
      placeholder: '{\n  "option": "value"\n}',
      group: 'general',
      advanced: true
    }
  };
};

const DynamicConfigurationForm: React.FC<DynamicConfigurationFormProps> = ({
  extension,
  initialConfig,
  onSave,
  onCancel,
  isOpen,
  loading = false,
  className
}) => {
  const [formData, setFormData] = useState<ConfigFormData>({});
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [saving, setSaving] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['general']));

  const configSchema = useMemo(() => getConfigurationSchema(extension), [extension]);

  // Initialize form data
  useEffect(() => {
    const initialData: ConfigFormData = {};

    // Set defaults from schema
    Object.entries(configSchema).forEach(([key, schema]) => {
      if (schema.default !== undefined) {
        initialData[key] = schema.default;
      }
    });

    // Override with existing config
    if (initialConfig?.config) {
      Object.assign(initialData, initialConfig.config);
    }

    setFormData(initialData);
  }, [configSchema, initialConfig]);

  const validateField = useCallback((key: string, value: any, schema: ConfigSchema): string | null => {
    // Required validation
    if (schema.required && (value === undefined || value === null || value === '')) {
      return `${schema.label} is required`;
    }

    // Skip validation if field is empty and not required
    if (!schema.required && (value === undefined || value === null || value === '')) {
      return null;
    }

    // Type-specific validation
    switch (schema.type) {
      case 'number':
        if (isNaN(Number(value))) return `${schema.label} must be a number`;
        if (schema.validation?.min !== undefined && Number(value) < schema.validation.min) {
          return schema.validation.message || `${schema.label} must be at least ${schema.validation.min}`;
        }
        if (schema.validation?.max !== undefined && Number(value) > schema.validation.max) {
          return schema.validation.message || `${schema.label} must be at most ${schema.validation.max}`;
        }
        break;

      case 'string':
      case 'url':
        if (schema.validation?.pattern) {
          const regex = new RegExp(schema.validation.pattern);
          if (!regex.test(String(value))) {
            return schema.validation.message || `${schema.label} format is invalid`;
          }
        }
        if (schema.type === 'url') {
          try {
            new URL(String(value));
          } catch {
            return `${schema.label} must be a valid URL`;
          }
        }
        break;

      case 'json':
        try {
          JSON.parse(String(value));
        } catch {
          return `${schema.label} must be valid JSON`;
        }
        break;
    }

    return null;
  }, []);

  const validateForm = useCallback((): ValidationError[] => {
    const errors: ValidationError[] = [];

    Object.entries(configSchema).forEach(([key, schema]) => {
      // Check if field should be shown based on conditionals
      if (schema.conditional) {
        const conditionValue = formData[schema.conditional.field];
        let conditionMet = false;

        switch (schema.conditional.operator) {
          case 'equals':
            conditionMet = conditionValue === schema.conditional.value;
            break;
          case 'not_equals':
            conditionMet = conditionValue !== schema.conditional.value;
            break;
          case 'contains':
            conditionMet = Array.isArray(conditionValue) && conditionValue.includes(schema.conditional.value);
            break;
          case 'greater_than':
            conditionMet = Number(conditionValue) > schema.conditional.value;
            break;
          case 'less_than':
            conditionMet = Number(conditionValue) < schema.conditional.value;
            break;
        }

        if (!conditionMet) return; // Skip validation for hidden fields
      }

      const error = validateField(key, formData[key], schema);
      if (error) {
        errors.push({ field: key, message: error });
      }
    });

    return errors;
  }, [configSchema, formData, validateField]);

  const handleInputChange = useCallback((key: string, value: any) => {
    setFormData(prev => ({ ...prev, [key]: value }));

    // Clear validation error for this field
    setValidationErrors(prev => prev.filter(error => error.field !== key));
  }, []);

  const handleArrayChange = useCallback((key: string, index: number, value: any) => {
    setFormData(prev => {
      const array = Array.isArray(prev[key]) ? [...prev[key]] : [];
      array[index] = value;
      return { ...prev, [key]: array };
    });
  }, []);

  const handleArrayAdd = useCallback((key: string, schema: ConfigSchema) => {
    setFormData(prev => {
      const array = Array.isArray(prev[key]) ? [...prev[key]] : [];
      const defaultValue = schema.items?.type === 'object' ? {} : schema.items?.type === 'string' ? '' : null;
      array.push(defaultValue);
      return { ...prev, [key]: array };
    });
  }, []);

  const handleArrayRemove = useCallback((key: string, index: number) => {
    setFormData(prev => {
      const array = Array.isArray(prev[key]) ? [...prev[key]] : [];
      array.splice(index, 1);
      return { ...prev, [key]: array };
    });
  }, []);

  const handleObjectChange = useCallback((key: string, objectKey: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [key]: {
        ...(prev[key] || {}),
        [objectKey]: value
      }
    }));
  }, []);

  const toggleGroup = useCallback((groupName: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupName)) {
        next.delete(groupName);
      } else {
        next.add(groupName);
      }
      return next;
    });
  }, []);

  const handleSave = useCallback(async () => {
    const errors = validateForm();
    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }

    setSaving(true);
    try {
      await onSave(formData);
    } catch (error) {
      console.error('Save error:', error);
    } finally {
      setSaving(false);
    }
  }, [formData, validateForm, onSave]);

  const shouldShowField = useCallback((schema: ConfigSchema): boolean => {
    if (schema.advanced && !showAdvanced) return false;

    if (schema.conditional) {
      const conditionValue = formData[schema.conditional.field];

      switch (schema.conditional.operator) {
        case 'equals':
          return conditionValue === schema.conditional.value;
        case 'not_equals':
          return conditionValue !== schema.conditional.value;
        case 'contains':
          return Array.isArray(conditionValue) && conditionValue.includes(schema.conditional.value);
        case 'greater_than':
          return Number(conditionValue) > schema.conditional.value;
        case 'less_than':
          return Number(conditionValue) < schema.conditional.value;
      }
    }

    return true;
  }, [formData, showAdvanced]);

  const renderField = useCallback((key: string, schema: ConfigSchema) => {
    if (!shouldShowField(schema)) return null;

    const value = formData[key];
    const error = validationErrors.find(e => e.field === key);

    const fieldProps = {
      id: key,
      value: value || (schema.type === 'array' ? [] : schema.type === 'object' ? {} : ''),
      onChange: (newValue: any) => handleInputChange(key, newValue),
      className: cn(
        'w-full',
        error && 'border-operation-alert focus:border-operation-alert'
      ),
      placeholder: schema.placeholder,
      required: schema.required
    };

    switch (schema.type) {
      case 'string':
      case 'url':
        return (
          <Input
            {...fieldProps}
            type={schema.type === 'url' ? 'url' : 'text'}
            onChange={(e) => fieldProps.onChange(e.target.value)}
          />
        );

      case 'number':
        return (
          <Input
            {...fieldProps}
            type="number"
            min={schema.validation?.min}
            max={schema.validation?.max}
            onChange={(e) => fieldProps.onChange(Number(e.target.value))}
          />
        );

      case 'boolean':
        return (
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={Boolean(value)}
              onChange={(e) => fieldProps.onChange(e.target.checked)}
              className="w-4 h-4 text-operation-active bg-depth-ocean/20 border-interface-border/30 rounded focus:ring-operation-active focus:ring-2"
            />
            <span className="text-sm text-light-secondary">
              {schema.description || 'Enable this option'}
            </span>
          </label>
        );

      case 'select':
        return (
          <select
            {...fieldProps}
            onChange={(e) => fieldProps.onChange(e.target.value)}
            className="p-2 bg-depth-ocean/20 border border-interface-border/30 rounded text-light-primary focus:border-operation-active focus:outline-none"
          >
            <option value="">Select an option...</option>
            {schema.options?.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );

      case 'multiselect':
        return (
          <div className="space-y-2">
            {schema.options?.map(option => (
              <label key={option.value} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={Array.isArray(value) && value.includes(option.value)}
                  onChange={(e) => {
                    const currentArray = Array.isArray(value) ? value : [];
                    if (e.target.checked) {
                      fieldProps.onChange([...currentArray, option.value]);
                    } else {
                      fieldProps.onChange(currentArray.filter(v => v !== option.value));
                    }
                  }}
                  className="w-4 h-4 text-operation-active bg-depth-ocean/20 border-interface-border/30 rounded focus:ring-operation-active focus:ring-2"
                />
                <div>
                  <span className="text-sm text-light-primary">{option.label}</span>
                  {option.description && (
                    <div className="text-xs text-light-secondary">{option.description}</div>
                  )}
                </div>
              </label>
            ))}
          </div>
        );

      case 'json':
        return (
          <Textarea
            {...fieldProps}
            rows={6}
            onChange={(e) => fieldProps.onChange(e.target.value)}
            className="font-mono text-sm"
          />
        );

      case 'color':
        return (
          <div className="flex gap-2">
            <input
              type="color"
              value={value || '#000000'}
              onChange={(e) => fieldProps.onChange(e.target.value)}
              className="w-12 h-10 border border-interface-border/30 rounded cursor-pointer"
            />
            <Input
              {...fieldProps}
              type="text"
              onChange={(e) => fieldProps.onChange(e.target.value)}
              className="flex-1"
            />
          </div>
        );

      case 'array':
        const arrayValue = Array.isArray(value) ? value : [];
        return (
          <div className="space-y-3">
            {arrayValue.map((item, index) => (
              <div key={index} className="flex gap-2 items-start">
                <div className="flex-1">
                  {schema.items?.type === 'object' && schema.items.properties ? (
                    <div className="space-y-2 p-3 border border-interface-border/20 rounded">
                      {Object.entries(schema.items.properties).map(([objKey, objSchema]) => (
                        <div key={objKey}>
                          <label className="block text-sm font-medium text-light-secondary mb-1">
                            {objSchema.label}
                          </label>
                          <Input
                            value={(item as any)?.[objKey] || ''}
                            onChange={(e) => {
                              const newItem = { ...(item as any), [objKey]: e.target.value };
                              handleArrayChange(key, index, newItem);
                            }}
                            placeholder={objSchema.placeholder}
                            className="w-full"
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <Input
                      value={item || ''}
                      onChange={(e) => handleArrayChange(key, index, e.target.value)}
                      placeholder={schema.items?.placeholder}
                      className="w-full"
                    />
                  )}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleArrayRemove(key, index)}
                  className="border-operation-alert/30 text-operation-alert hover:bg-operation-alert/10"
                >
                  Remove
                </Button>
              </div>
            ))}
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleArrayAdd(key, schema)}
              className="border-operation-active/30 text-operation-active hover:bg-operation-active/10"
            >
              Add Item
            </Button>
          </div>
        );

      case 'object':
        const objectValue = value || {};
        return (
          <div className="space-y-3 p-4 border border-interface-border/20 rounded">
            {Object.entries(schema.properties || {}).map(([objKey, objSchema]) => (
              <div key={objKey}>
                <label className="block text-sm font-medium text-light-secondary mb-1">
                  {objSchema.label}
                  {objSchema.required && <span className="text-operation-alert ml-1">*</span>}
                </label>
                <div className="space-y-1">
                  {renderObjectField(key, objKey, objSchema, objectValue[objKey])}
                  {objSchema.description && (
                    <p className="text-xs text-light-secondary">{objSchema.description}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        );

      default:
        return (
          <Input
            {...fieldProps}
            type="text"
            onChange={(e) => fieldProps.onChange(e.target.value)}
          />
        );
    }
  }, [formData, validationErrors, shouldShowField, handleInputChange, handleArrayChange, handleArrayAdd, handleArrayRemove]);

  const renderObjectField = useCallback((parentKey: string, objKey: string, schema: ConfigSchema, value: any) => {
    const error = validationErrors.find(e => e.field === `${parentKey}.${objKey}`);

    switch (schema.type) {
      case 'select':
        return (
          <select
            value={value || ''}
            onChange={(e) => handleObjectChange(parentKey, objKey, e.target.value)}
            className={cn(
              'w-full p-2 bg-depth-ocean/20 border border-interface-border/30 rounded text-light-primary focus:border-operation-active focus:outline-none',
              error && 'border-operation-alert'
            )}
          >
            <option value="">Select an option...</option>
            {schema.options?.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );

      default:
        return (
          <Input
            type={schema.type === 'url' ? 'url' : 'text'}
            value={value || ''}
            onChange={(e) => handleObjectChange(parentKey, objKey, e.target.value)}
            placeholder={schema.placeholder}
            className={cn('w-full', error && 'border-operation-alert')}
          />
        );
    }
  }, [validationErrors, handleObjectChange]);

  // Group fields by group
  const groupedFields = useMemo(() => {
    const groups: Record<string, Array<[string, ConfigSchema]>> = {};

    Object.entries(configSchema).forEach(([key, schema]) => {
      const groupName = schema.group || 'general';
      if (!groups[groupName]) {
        groups[groupName] = [];
      }
      groups[groupName].push([key, schema]);
    });

    return groups;
  }, [configSchema]);

  if (!isOpen) return null;

  return (
    <div className={cn('fixed inset-0 bg-depth-void/50 backdrop-blur-sm z-50 flex items-center justify-center p-4', className)}>
      <Card className="card-operational w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <CardContent className="p-0">
          {/* Header */}
          <div className="p-6 border-b border-interface-border/20">
            <div className="flex items-center justify-between mb-2">
              <h2 className="type-subtitle text-light-primary">Configure {extension.name}</h2>
              <div className="flex items-center gap-2">
                <Badge className="bg-depth-ocean/30 text-light-secondary border-interface-border/30">
                  {extension.category}
                </Badge>
                <Badge className="bg-depth-ocean/30 text-light-secondary border-interface-border/30">
                  v{extension.version}
                </Badge>
              </div>
            </div>
            <p className="text-sm text-light-secondary">{extension.description}</p>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto max-h-[calc(90vh-200px)]">
            <div className="p-6 space-y-6">
              {/* Advanced Toggle */}
              {Object.values(configSchema).some(schema => schema.advanced) && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showAdvanced}
                    onChange={(e) => setShowAdvanced(e.target.checked)}
                    className="w-4 h-4 text-operation-active bg-depth-ocean/20 border-interface-border/30 rounded focus:ring-operation-active focus:ring-2"
                  />
                  <span className="text-sm text-light-secondary">Show advanced options</span>
                </label>
              )}

              {/* Form Groups */}
              {Object.entries(groupedFields).map(([groupName, fields]) => (
                <Card key={groupName} className="card-operational">
                  <CardContent className="p-0">
                    <button
                      onClick={() => toggleGroup(groupName)}
                      className="w-full p-4 flex items-center justify-between text-left hover:bg-depth-ocean/10 transition-colors"
                    >
                      <h3 className="type-subtitle text-light-primary capitalize">
                        {groupName.replace(/([A-Z])/g, ' $1').toLowerCase()}
                      </h3>
                      <span className={cn(
                        'text-light-secondary transition-transform',
                        expandedGroups.has(groupName) ? 'rotate-180' : ''
                      )}>
                        ▼
                      </span>
                    </button>

                    {expandedGroups.has(groupName) && (
                      <div className="px-4 pb-4 space-y-4">
                        {fields
                          .filter(([, schema]) => shouldShowField(schema))
                          .map(([key, schema]) => {
                            const error = validationErrors.find(e => e.field === key);

                            return (
                              <div key={key} className="space-y-2">
                                <label className="block text-sm font-medium text-light-secondary">
                                  {schema.label}
                                  {schema.required && <span className="text-operation-alert ml-1">*</span>}
                                </label>

                                {renderField(key, schema)}

                                {error && (
                                  <p className="text-sm text-operation-alert">{error.message}</p>
                                )}

                                {schema.helpText && (
                                  <p className="text-xs text-light-secondary">{schema.helpText}</p>
                                )}

                                {schema.description && schema.type !== 'boolean' && (
                                  <p className="text-xs text-light-secondary">{schema.description}</p>
                                )}
                              </div>
                            );
                          })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-interface-border/20 flex items-center justify-between">
            <div className="text-sm text-light-secondary">
              {validationErrors.length > 0 && (
                <span className="text-operation-alert">
                  {validationErrors.length} validation error{validationErrors.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={onCancel}
                disabled={saving}
                className="border-interface-border/30 text-light-secondary hover:bg-interface-border/10"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving || loading}
                loading={saving}
                className="bg-operation-active text-depth-void hover:bg-interface-hover"
              >
                {saving ? 'Saving...' : 'Save Configuration'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DynamicConfigurationForm;
