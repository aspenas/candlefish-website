/**
 * PDF Estimate Generator
 * Complete PDF generation and management component
 */

'use client';

import React, { useState, useCallback } from 'react';
import {
  FileText,
  Download,
  Mail,
  Share2,
  Settings,
  Eye,
  CheckCircle,
  AlertCircle,
  Loader2,
  Users,
  Package,
  DollarSign
} from 'lucide-react';
import { Button } from './Button';
import { Card } from './card';
import { Badge } from './badge';
import { PDFViewer } from './PDFViewer';
import { CompanyBranding, CompanyInfo } from './CompanyBranding';
import { toast } from 'sonner';
import { useEstimateStore } from '@/stores/useEstimateStore';

interface PDFEstimateGeneratorProps {
  estimate?: any;
  companyInfo: CompanyInfo;
  photos?: any[];
  onPDFGenerated?: (pdfData: { url: string; metadata: any }) => void;
  onEmailSent?: (recipients: string[]) => void;
  className?: string;
}

interface GenerationOptions {
  template: 'standard' | 'premium' | 'professional';
  includePhotos: boolean;
  includeSignature: boolean;
  includePricingComparison: boolean;
  watermark?: string;
  storage: 'local' | 's3' | 'cloudinary';
}

export const PDFEstimateGenerator: React.FC<PDFEstimateGeneratorProps> = ({
  estimate: propEstimate,
  companyInfo,
  photos = [],
  onPDFGenerated,
  onEmailSent,
  className = ''
}) => {
  const { estimate: storeEstimate } = useEstimateStore();
  const estimate = propEstimate || storeEstimate;

  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPDF, setGeneratedPDF] = useState<{
    url: string;
    base64?: string;
    metadata: any;
  } | null>(null);
  const [showViewer, setShowViewer] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [options, setOptions] = useState<GenerationOptions>({
    template: 'standard',
    includePhotos: true,
    includeSignature: false,
    includePricingComparison: false,
    storage: 'local'
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const validateEstimate = (): string[] => {
    const errors: string[] = [];

    if (!estimate) {
      errors.push('No estimate data available');
      return errors;
    }

    if (!estimate.clientInfo?.name) {
      errors.push('Client name is required');
    }

    if (!estimate.clientInfo?.email) {
      errors.push('Client email is required');
    }

    if (!estimate.calculations?.total) {
      errors.push('Estimate total is required');
    }

    if (!estimate.pricing?.tier) {
      errors.push('Pricing tier is required');
    }

    return errors;
  };

  const generatePDF = useCallback(async () => {
    const validationErrors = validateEstimate();
    if (validationErrors.length > 0) {
      toast.error(`Cannot generate PDF: ${validationErrors[0]}`);
      return;
    }

    setIsGenerating(true);

    try {
      // Prepare request data
      const requestData = {
        estimate,
        companyInfo,
        photos: options.includePhotos ? photos : [],
        watermark: options.watermark,
        template: options.template,
        storage: options.storage,
        returnType: 'url'
      };

      // Generate PDF via API
      const response = await fetch('/api/v1/pdf/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to generate PDF');
      }

      const result = await response.json();

      if (result.success) {
        setGeneratedPDF({
          url: result.data.url,
          metadata: result.data.metadata
        });

        onPDFGenerated?.(result.data);
        toast.success('PDF generated successfully!');
        setShowViewer(true);
      } else {
        throw new Error(result.error || 'PDF generation failed');
      }
    } catch (error) {
      console.error('PDF generation error:', error);
      toast.error(`Failed to generate PDF: ${error.message}`);
    } finally {
      setIsGenerating(false);
    }
  }, [estimate, companyInfo, photos, options, onPDFGenerated]);

  const generateAllTiers = useCallback(async () => {
    if (!estimate) return;

    setIsGenerating(true);

    try {
      // Generate PDFs for all pricing tiers
      const tiers = ['Good', 'Better', 'Best'];
      const pdfPromises = tiers.map(async (tierName) => {
        const tierEstimate = {
          ...estimate,
          pricing: {
            ...estimate.pricing,
            tier: {
              name: tierName,
              multiplier: tierName === 'Good' ? 1.0 : tierName === 'Better' ? 1.2 : 1.5,
              features: getTierFeatures(tierName)
            }
          },
          calculations: {
            ...estimate.calculations,
            total: estimate.calculations.subtotal * (tierName === 'Good' ? 1.0 : tierName === 'Better' ? 1.2 : 1.5) + estimate.calculations.tax
          }
        };

        const response = await fetch('/api/v1/pdf/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            estimate: tierEstimate,
            companyInfo,
            photos: options.includePhotos ? photos : [],
            template: options.template,
            storage: options.storage,
            returnType: 'url'
          }),
        });

        const result = await response.json();
        return { tier: tierName, ...result.data };
      });

      const results = await Promise.all(pdfPromises);

      // Create download links for all tiers
      results.forEach(result => {
        const link = document.createElement('a');
        link.href = result.url;
        link.download = `estimate-${estimate.clientInfo.name}-${result.tier}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      });

      toast.success('All pricing tier PDFs generated and downloaded!');
    } catch (error) {
      console.error('Multi-tier PDF generation error:', error);
      toast.error('Failed to generate pricing tier PDFs');
    } finally {
      setIsGenerating(false);
    }
  }, [estimate, companyInfo, photos, options]);

  const getTierFeatures = (tierName: string): string[] => {
    const baseFeatures = [
      'Professional paint application',
      'Surface preparation and cleaning',
      'Quality paint and materials',
      'Cleanup and disposal',
      'Project completion guarantee'
    ];

    const betterFeatures = [
      ...baseFeatures,
      'Premium paint upgrade',
      'Detailed surface repair',
      'Color consultation',
      '2-coat application guarantee'
    ];

    const bestFeatures = [
      ...betterFeatures,
      'Ultra-premium paint',
      'Advanced surface treatments',
      'Designer color matching',
      'Extended warranty coverage',
      'Priority scheduling'
    ];

    switch (tierName) {
      case 'Better':
        return betterFeatures;
      case 'Best':
        return bestFeatures;
      default:
        return baseFeatures;
    }
  };

  if (!estimate) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No Estimate Available
          </h3>
          <p className="text-gray-600 mb-4">
            Please complete the estimate form before generating a PDF.
          </p>
          <Button variant="outline">
            <FileText className="w-4 h-4 mr-2" />
            Create New Estimate
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Company Branding */}
      <CompanyBranding
        companyInfo={companyInfo}
        variant="minimal"
        className="mb-4"
      />

      {/* Estimate Summary */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">
            PDF Estimate Generator
          </h2>
          <Badge variant="outline">
            {estimate.pricing?.tier?.name || 'Standard'} Package
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="flex items-center space-x-3 p-4 bg-blue-50 rounded-lg">
            <Users className="w-8 h-8 text-blue-600" />
            <div>
              <p className="text-sm font-medium text-blue-900">Client</p>
              <p className="text-lg font-semibold text-blue-800">
                {estimate.clientInfo?.name || 'Unknown'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3 p-4 bg-green-50 rounded-lg">
            <Package className="w-8 h-8 text-green-600" />
            <div>
              <p className="text-sm font-medium text-green-900">Package</p>
              <p className="text-lg font-semibold text-green-800">
                {estimate.pricing?.tier?.name || 'Standard'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3 p-4 bg-amber-50 rounded-lg">
            <DollarSign className="w-8 h-8 text-amber-600" />
            <div>
              <p className="text-sm font-medium text-amber-900">Total</p>
              <p className="text-lg font-semibold text-amber-800">
                {estimate.calculations?.total ? formatCurrency(estimate.calculations.total) : '$0.00'}
              </p>
            </div>
          </div>
        </div>

        {/* Generation Options */}
        {showOptions && (
          <div className="border border-gray-200 rounded-lg p-4 mb-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">
              PDF Options
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Template Style
                </label>
                <select
                  value={options.template}
                  onChange={(e) => setOptions(prev => ({
                    ...prev,
                    template: e.target.value as 'standard' | 'premium' | 'professional'
                  }))}
                  className="w-full p-2 border border-gray-300 rounded-md"
                >
                  <option value="standard">Standard</option>
                  <option value="premium">Premium</option>
                  <option value="professional">Professional</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Storage Location
                </label>
                <select
                  value={options.storage}
                  onChange={(e) => setOptions(prev => ({
                    ...prev,
                    storage: e.target.value as 'local' | 's3' | 'cloudinary'
                  }))}
                  className="w-full p-2 border border-gray-300 rounded-md"
                >
                  <option value="local">Local Storage</option>
                  <option value="s3">AWS S3</option>
                  <option value="cloudinary">Cloudinary</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Watermark (optional)
                </label>
                <input
                  type="text"
                  value={options.watermark || ''}
                  onChange={(e) => setOptions(prev => ({ ...prev, watermark: e.target.value }))}
                  placeholder="DRAFT, CONFIDENTIAL, etc."
                  className="w-full p-2 border border-gray-300 rounded-md"
                />
              </div>
            </div>

            <div className="mt-4 space-y-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={options.includePhotos}
                  onChange={(e) => setOptions(prev => ({ ...prev, includePhotos: e.target.checked }))}
                  className="mr-2"
                />
                Include project photos ({photos.length} available)
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={options.includeSignature}
                  onChange={(e) => setOptions(prev => ({ ...prev, includeSignature: e.target.checked }))}
                  className="mr-2"
                />
                Include signature area
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={options.includePricingComparison}
                  onChange={(e) => setOptions(prev => ({ ...prev, includePricingComparison: e.target.checked }))}
                  className="mr-2"
                />
                Include pricing tier comparison
              </label>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3">
          <Button
            onClick={generatePDF}
            disabled={isGenerating}
            className="flex items-center space-x-2"
          >
            {isGenerating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <FileText className="w-4 h-4" />
            )}
            <span>Generate PDF</span>
          </Button>

          <Button
            variant="outline"
            onClick={generateAllTiers}
            disabled={isGenerating}
            className="flex items-center space-x-2"
          >
            <Package className="w-4 h-4" />
            <span>All Pricing Tiers</span>
          </Button>

          <Button
            variant="outline"
            onClick={() => setShowOptions(!showOptions)}
            className="flex items-center space-x-2"
          >
            <Settings className="w-4 h-4" />
            <span>Options</span>
          </Button>

          {generatedPDF && (
            <Button
              variant="outline"
              onClick={() => setShowViewer(!showViewer)}
              className="flex items-center space-x-2"
            >
              <Eye className="w-4 h-4" />
              <span>{showViewer ? 'Hide' : 'Show'} Preview</span>
            </Button>
          )}
        </div>

        {/* Status */}
        {generatedPDF && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="text-sm font-medium text-green-800">
                PDF generated successfully
              </span>
              <Badge variant="outline" className="ml-auto">
                {generatedPDF.metadata?.fileSize ?
                  `${Math.round(generatedPDF.metadata.fileSize / 1024)} KB` :
                  'Ready'
                }
              </Badge>
            </div>
          </div>
        )}
      </Card>

      {/* PDF Viewer */}
      {showViewer && generatedPDF && (
        <PDFViewer
          pdfUrl={generatedPDF.url}
          pdfBase64={generatedPDF.base64}
          estimate={estimate}
          companyInfo={companyInfo}
          onDownload={() => {
            toast.success('PDF download initiated');
          }}
          onEmail={(recipients) => {
            onEmailSent?.(recipients);
            toast.success(`PDF sent to ${recipients.length} recipient${recipients.length > 1 ? 's' : ''}`);
          }}
          onShare={() => {
            toast.success('PDF shared successfully');
          }}
        />
      )}
    </div>
  );
};
