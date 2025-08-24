'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Badge } from '../ui/Badge';
import { Textarea } from '../ui/Textarea';
import { ConfigurationPanelProps } from '../../types/netlify';
import { cn } from '../../utils/cn';

const ConfigurationPanel: React.FC<ConfigurationPanelProps> = ({
  extension,
  config,
  onSave,
  onCancel,
  isOpen,
}) => {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Initialize form data when config changes
  useEffect(() => {
    if (config?.config) {
      setFormData(config.config);
    } else {
      // Set default values based on extension type
      setFormData(getDefaultConfig(extension));
    }
    setIsDirty(false);
    setValidationErrors({});
  }, [extension, config]);

  const getDefaultConfig = (ext: typeof extension) => {
    // Default configurations based on extension category
    const defaults: Record<string, any> = {
      performance: {
        cacheTtl: 3600,
        compressionLevel: 6,
        enablePreloading: true,
      },
      security: {
        enableHSTS: true,
        maxAge: 31536000,
        includeSubdomains: true,
      },
      seo: {
        enableSitemap: true,
        robotsPolicy: 'index, follow',
        enableStructuredData: true,
      },
      analytics: {
        enableTracking: true,
        respectDNT: true,
        anonymizeIP: true,
      },
      forms: {
        enableSpamFilter: true,
        requireCaptcha: false,
        notificationEmail: '',
      },
      edge: {
        regions: ['us-east-1', 'eu-west-1'],
        enableCompression: true,
      }
    };

    return defaults[ext.category] || {};
  };

  const getConfigSchema = (ext: typeof extension) => {
    // Configuration schemas based on extension category
    const schemas: Record<string, any> = {
      performance: [
        { key: 'cacheTtl', type: 'number', label: 'Cache TTL (seconds)', min: 300, max: 86400 },
        { key: 'compressionLevel', type: 'select', label: 'Compression Level', options: [
          { value: 1, label: 'Low (1)' },
          { value: 6, label: 'Medium (6)' },
          { value: 9, label: 'High (9)' }
        ]},
        { key: 'enablePreloading', type: 'boolean', label: 'Enable Resource Preloading' },
      ],
      security: [
        { key: 'enableHSTS', type: 'boolean', label: 'Enable HSTS' },
        { key: 'maxAge', type: 'number', label: 'Max Age (seconds)', min: 300, max: 63072000 },
        { key: 'includeSubdomains', type: 'boolean', label: 'Include Subdomains' },
      ],
      seo: [
        { key: 'enableSitemap', type: 'boolean', label: 'Auto-generate Sitemap' },
        { key: 'robotsPolicy', type: 'select', label: 'Robots Policy', options: [
          { value: 'index, follow', label: 'Index, Follow' },
          { value: 'index, nofollow', label: 'Index, No Follow' },
          { value: 'noindex, follow', label: 'No Index, Follow' },
          { value: 'noindex, nofollow', label: 'No Index, No Follow' }
        ]},
        { key: 'enableStructuredData', type: 'boolean', label: 'Enable Structured Data' },
      ],
      analytics: [
        { key: 'enableTracking', type: 'boolean', label: 'Enable Tracking' },
        { key: 'respectDNT', type: 'boolean', label: 'Respect Do Not Track' },
        { key: 'anonymizeIP', type: 'boolean', label: 'Anonymize IP Addresses' },
        { key: 'trackingId', type: 'string', label: 'Tracking ID', placeholder: 'GA-XXXXX-X' },
      ],
      forms: [
        { key: 'enableSpamFilter', type: 'boolean', label: 'Enable Spam Filter' },
        { key: 'requireCaptcha', type: 'boolean', label: 'Require CAPTCHA' },
        { key: 'notificationEmail', type: 'email', label: 'Notification Email', required: true },
      ],
      edge: [
        { key: 'regions', type: 'multiselect', label: 'Edge Regions', options: [
          { value: 'us-east-1', label: 'US East (N. Virginia)' },
          { value: 'us-west-2', label: 'US West (Oregon)' },
          { value: 'eu-west-1', label: 'Europe (Ireland)' },
          { value: 'ap-southeast-1', label: 'Asia Pacific (Singapore)' },
        ]},
        { key: 'enableCompression', type: 'boolean', label: 'Enable Compression' },
      ]
    };

    return schemas[ext.category] || [];
  };

  const validateField = (key: string, value: any, field: any) => {
    const errors: string[] = [];

    if (field.required && (!value || value === '')) {
      errors.push('This field is required');
    }

    if (field.type === 'number' && value !== '') {
      const numValue = Number(value);
      if (isNaN(numValue)) {
        errors.push('Must be a valid number');
      } else {
        if (field.min !== undefined && numValue < field.min) {
          errors.push(`Must be at least ${field.min}`);
        }
        if (field.max !== undefined && numValue > field.max) {
          errors.push(`Must be at most ${field.max}`);
        }
      }
    }

    if (field.type === 'email' && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      errors.push('Must be a valid email address');
    }

    return errors.length > 0 ? errors[0] : '';
  };

  const handleInputChange = (key: string, value: any) => {
    setFormData(prev => ({ ...prev, [key]: value }));
    setIsDirty(true);

    // Clear validation error for this field
    if (validationErrors[key]) {
      setValidationErrors(prev => ({ ...prev, [key]: '' }));
    }
  };

  const handleSave = async () => {
    // Validate all fields
    const schema = getConfigSchema(extension);
    const errors: Record<string, string> = {};

    schema.forEach(field => {
      const error = validateField(field.key, formData[field.key], field);
      if (error) {
        errors[field.key] = error;
      }
    });

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    setIsSaving(true);
    try {
      await onSave(formData);
      setIsDirty(false);
    } finally {
      setIsSaving(false);
    }
  };

  const renderField = (field: any) => {
    const value = formData[field.key];
    const error = validationErrors[field.key];

    switch (field.type) {
      case 'boolean':
        return (
          <div className="flex items-center justify-between">
            <label className="text-sm text-light-primary font-medium">
              {field.label}
            </label>
            <button
              type="button"
              onClick={() => handleInputChange(field.key, !value)}
              className={cn(
                'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                'focus:outline-none focus:ring-2 focus:ring-operation-active focus:ring-offset-2',
                value 
                  ? 'bg-operation-active' 
                  : 'bg-light-tertiary/20 border border-light-tertiary/30'
              )}
            >
              <span
                className={cn(
                  'inline-block h-4 w-4 transform rounded-full transition-transform',
                  'bg-light-primary shadow-sm',
                  value ? 'translate-x-6' : 'translate-x-1'
                )}
              />
            </button>
          </div>
        );

      case 'select':
        return (
          <div>
            <label className="block text-sm text-light-primary font-medium mb-2">
              {field.label}
            </label>
            <select
              value={value || ''}
              onChange={(e) => handleInputChange(field.key, e.target.value)}
              className={cn(
                'w-full px-3 py-2 bg-depth-steel/20 border rounded text-light-primary text-sm',
                'focus:border-operation-active focus:outline-none transition-colors',
                error ? 'border-operation-alert' : 'border-interface-border/30'
              )}
            >
              {field.options?.map((option: any) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {error && (
              <p className="text-xs text-operation-alert mt-1">{error}</p>
            )}
          </div>
        );

      case 'multiselect':
        return (
          <div>
            <label className="block text-sm text-light-primary font-medium mb-2">
              {field.label}
            </label>
            <div className="space-y-2">
              {field.options?.map((option: any) => (
                <label key={option.value} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={(value || []).includes(option.value)}
                    onChange={(e) => {
                      const currentValues = value || [];
                      const newValues = e.target.checked
                        ? [...currentValues, option.value]
                        : currentValues.filter((v: any) => v !== option.value);
                      handleInputChange(field.key, newValues);
                    }}
                    className="rounded border-interface-border/30 text-operation-active focus:ring-operation-active"
                  />
                  <span className="text-sm text-light-secondary">
                    {option.label}
                  </span>
                </label>
              ))}
            </div>
          </div>
        );

      case 'textarea':
        return (
          <div>
            <label className="block text-sm text-light-primary font-medium mb-2">
              {field.label}
            </label>
            <Textarea
              value={value || ''}
              onChange={(e) => handleInputChange(field.key, e.target.value)}
              placeholder={field.placeholder}
              className={cn(
                'bg-depth-steel/20 border text-light-primary placeholder-light-tertiary',
                error ? 'border-operation-alert' : 'border-interface-border/30'
              )}
              rows={3}
            />
            {error && (
              <p className="text-xs text-operation-alert mt-1">{error}</p>
            )}
          </div>
        );

      default: // string, number, email
        return (
          <div>
            <label className="block text-sm text-light-primary font-medium mb-2">
              {field.label}
            </label>
            <Input
              type={field.type === 'number' ? 'number' : field.type === 'email' ? 'email' : 'text'}
              value={value || ''}
              onChange={(e) => handleInputChange(field.key, 
                field.type === 'number' ? Number(e.target.value) : e.target.value
              )}
              placeholder={field.placeholder}
              min={field.min}
              max={field.max}
              className={cn(
                'bg-depth-steel/20 border text-light-primary placeholder-light-tertiary',
                error ? 'border-operation-alert' : 'border-interface-border/30'
              )}
            />
            {error && (
              <p className="text-xs text-operation-alert mt-1">{error}</p>
            )}
          </div>
        );
    }
  };

  if (!isOpen) return null;

  const schema = getConfigSchema(extension);

  return (
    <div className="fixed inset-0 bg-depth-void/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-hidden">
        <Card className="card-operational border-operation-active/50">
          <CardHeader className="border-b border-interface-border/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="text-2xl opacity-60">
                  {extension.icon || '🔧'}
                </div>
                <div>
                  <CardTitle className="text-light-primary">
                    Configure {extension.name}
                  </CardTitle>
                  <p className="text-sm text-light-secondary mt-1">
                    {extension.description}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs border-interface-border/30">
                  {extension.category}
                </Badge>
                <Badge variant="outline" className="text-xs border-interface-border/30">
                  v{extension.version}
                </Badge>
              </div>
            </div>
          </CardHeader>

          <CardContent className="max-h-[60vh] overflow-y-auto p-6">
            <div className="space-y-6">
              {schema.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-4xl opacity-20 mb-4">⚙️</div>
                  <p className="text-light-secondary">
                    This extension doesn't have configurable options.
                  </p>
                </div>
              ) : (
                schema.map((field) => (
                  <div key={field.key}>
                    {renderField(field)}
                  </div>
                ))
              )}
            </div>
          </CardContent>

          <div className="border-t border-interface-border/20 p-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isDirty && (
                <Badge variant="outline" className="text-xs border-operation-pending/30 text-operation-pending">
                  UNSAVED CHANGES
                </Badge>
              )}
              {config?.lastModified && (
                <span className="text-xs text-light-tertiary">
                  Last modified: {new Date(config.lastModified).toLocaleString()}
                </span>
              )}
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={onCancel}
                disabled={isSaving}
                className="border-interface-border/30 text-light-secondary hover:border-operation-active/50"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                loading={isSaving}
                disabled={!isDirty || isSaving}
                className="bg-operation-active text-depth-void hover:bg-interface-hover"
              >
                {isSaving ? 'Saving...' : 'Save Configuration'}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default ConfigurationPanel;