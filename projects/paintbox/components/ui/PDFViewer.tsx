/**
 * PDF Viewer Component
 * Professional PDF preview component with download and email capabilities
 */

'use client';

import React, { useState, useRef, useCallback } from 'react';
import {
  Download,
  Mail,
  Share2,
  Printer,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Maximize2,
  FileText,
  CheckCircle,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff
} from 'lucide-react';
import { Document, Page, pdfjs } from 'react-pdf';
import { Button } from './Button';
import { Card } from './card';
import { Badge } from './badge';
import { toast } from 'sonner';

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

interface PDFViewerProps {
  pdfUrl?: string;
  pdfBase64?: string;
  estimate: {
    id: string;
    clientInfo: {
      name: string;
      email: string;
    };
    calculations: {
      total: number;
    };
    pricing: {
      tier: {
        name: string;
      };
    };
  };
  companyInfo: {
    name: string;
    email: string;
  };
  onDownload?: () => void;
  onEmail?: (recipients: string[]) => void;
  onShare?: () => void;
  className?: string;
}

interface EmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSend: (recipients: string[], subject: string, message: string) => void;
  defaultRecipients: string[];
  loading: boolean;
}

const EmailModal: React.FC<EmailModalProps> = ({
  isOpen,
  onClose,
  onSend,
  defaultRecipients,
  loading
}) => {
  const [recipients, setRecipients] = useState<string>(defaultRecipients.join(', '));
  const [subject, setSubject] = useState<string>('Your Painting Estimate');
  const [message, setMessage] = useState<string>('Please find your detailed painting estimate attached. We look forward to working with you!');

  const handleSend = () => {
    const recipientList = recipients.split(',').map(email => email.trim()).filter(Boolean);
    if (recipientList.length === 0) {
      toast.error('Please enter at least one recipient');
      return;
    }
    onSend(recipientList, subject, message);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <h3 className="text-lg font-semibold mb-4">Send Estimate via Email</h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Recipients</label>
            <input
              type="text"
              value={recipients}
              onChange={(e) => setRecipients(e.target.value)}
              placeholder="client@example.com, additional@example.com"
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">Separate multiple emails with commas</p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Subject</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Message</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>
        </div>

        <div className="flex justify-end space-x-2 mt-6">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSend}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Mail className="w-4 h-4 mr-2" />
                Send Email
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export const PDFViewer: React.FC<PDFViewerProps> = ({
  pdfUrl,
  pdfBase64,
  estimate,
  companyInfo,
  onDownload,
  onEmail,
  onShare,
  className = ''
}) => {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [rotation, setRotation] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(true);

  const viewerRef = useRef<HTMLDivElement>(null);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setLoading(false);
    setError(null);
  }, []);

  const onDocumentLoadError = useCallback((error: Error) => {
    setError('Failed to load PDF. Please try again.');
    setLoading(false);
    console.error('PDF load error:', error);
  }, []);

  const handleZoomIn = () => {
    setScale(prev => Math.min(prev + 0.25, 3.0));
  };

  const handleZoomOut = () => {
    setScale(prev => Math.max(prev - 0.25, 0.5));
  };

  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  const handleFullscreen = () => {
    if (viewerRef.current) {
      if (!isFullscreen) {
        viewerRef.current.requestFullscreen?.();
      } else {
        document.exitFullscreen?.();
      }
      setIsFullscreen(!isFullscreen);
    }
  };

  const handleDownload = async () => {
    try {
      if (pdfUrl) {
        // Direct download from URL
        const link = document.createElement('a');
        link.href = pdfUrl;
        link.download = `estimate-${estimate.clientInfo.name.replace(/\s+/g, '-')}-${Date.now()}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else if (pdfBase64) {
        // Download from base64
        const byteCharacters = atob(pdfBase64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'application/pdf' });

        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `estimate-${estimate.clientInfo.name.replace(/\s+/g, '-')}-${Date.now()}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
      }

      onDownload?.();
      toast.success('PDF downloaded successfully');
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download PDF');
    }
  };

  const handleEmailSend = async (recipients: string[], subject: string, message: string) => {
    setEmailLoading(true);
    try {
      // Send email via API
      const response = await fetch('/api/v1/pdf/email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: recipients,
          subject,
          message,
          template: 'custom',
          estimate,
          companyInfo
        }),
      });

      if (response.ok) {
        toast.success(`Email sent to ${recipients.length} recipient${recipients.length > 1 ? 's' : ''}`);
        setEmailModalOpen(false);
        onEmail?.(recipients);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to send email');
      }
    } catch (error) {
      console.error('Email error:', error);
      toast.error('Failed to send email. Please try again.');
    } finally {
      setEmailLoading(false);
    }
  };

  const handleShare = async () => {
    try {
      if (navigator.share && pdfUrl) {
        await navigator.share({
          title: `Painting Estimate - ${estimate.clientInfo.name}`,
          text: `Painting estimate from ${companyInfo.name}`,
          url: pdfUrl,
        });
      } else {
        // Fallback: copy URL to clipboard
        if (pdfUrl) {
          await navigator.clipboard.writeText(pdfUrl);
          toast.success('PDF link copied to clipboard');
        } else {
          toast.error('Sharing not available for this PDF');
        }
      }
      onShare?.();
    } catch (error) {
      console.error('Share error:', error);
      toast.error('Failed to share PDF');
    }
  };

  const handlePrint = () => {
    if (pdfUrl || pdfBase64) {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        const pdfSrc = pdfUrl || `data:application/pdf;base64,${pdfBase64}`;
        printWindow.document.write(`
          <html>
            <head>
              <title>Print Estimate</title>
              <style>
                body { margin: 0; padding: 0; }
                embed { width: 100%; height: 100vh; }
              </style>
            </head>
            <body>
              <embed src="${pdfSrc}" type="application/pdf">
            </body>
          </html>
        `);
        printWindow.document.close();
      }
    }
  };

  const pdfSource = pdfUrl || (pdfBase64 ? { data: `data:application/pdf;base64,${pdfBase64}` } : null);

  return (
    <div className={`bg-white rounded-lg shadow-lg ${className}`}>
      {/* Header */}
      <div className="border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <FileText className="w-6 h-6 text-blue-600" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Estimate for {estimate.clientInfo.name}
              </h3>
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <Badge variant="outline">
                  {estimate.pricing.tier.name} Package
                </Badge>
                <span>•</span>
                <span>{formatCurrency(estimate.calculations.total)}</span>
              </div>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowPreview(!showPreview)}
            className="flex items-center space-x-1"
          >
            {showPreview ? (
              <>
                <EyeOff className="w-4 h-4" />
                <span>Hide Preview</span>
              </>
            ) : (
              <>
                <Eye className="w-4 h-4" />
                <span>Show Preview</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Actions Bar */}
      <div className="border-b border-gray-200 p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
              className="flex items-center space-x-1"
            >
              <Download className="w-4 h-4" />
              <span>Download</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setEmailModalOpen(true)}
              className="flex items-center space-x-1"
            >
              <Mail className="w-4 h-4" />
              <span>Email</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleShare}
              className="flex items-center space-x-1"
            >
              <Share2 className="w-4 h-4" />
              <span>Share</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="flex items-center space-x-1"
            >
              <Printer className="w-4 h-4" />
              <span>Print</span>
            </Button>
          </div>

          {showPreview && (
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleZoomOut}
                disabled={scale <= 0.5}
              >
                <ZoomOut className="w-4 h-4" />
              </Button>

              <span className="text-sm text-gray-600 min-w-[60px] text-center">
                {Math.round(scale * 100)}%
              </span>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleZoomIn}
                disabled={scale >= 3.0}
              >
                <ZoomIn className="w-4 h-4" />
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleRotate}
              >
                <RotateCw className="w-4 h-4" />
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleFullscreen}
              >
                <Maximize2 className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* PDF Preview */}
      {showPreview && (
        <div
          ref={viewerRef}
          className={`relative ${isFullscreen ? 'h-screen' : 'h-[600px]'} overflow-auto bg-gray-100`}
        >
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex flex-col items-center space-y-2">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                <span className="text-sm text-gray-600">Loading PDF...</span>
              </div>
            </div>
          )}

          {error && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex flex-col items-center space-y-2 text-center p-6">
                <AlertCircle className="w-12 h-12 text-red-500" />
                <h4 className="text-lg font-semibold text-gray-900">Failed to Load PDF</h4>
                <p className="text-sm text-gray-600">{error}</p>
                <Button
                  variant="outline"
                  onClick={() => {
                    setError(null);
                    setLoading(true);
                  }}
                  className="mt-4"
                >
                  Try Again
                </Button>
              </div>
            </div>
          )}

          {pdfSource && !error && (
            <div className="flex justify-center p-4">
              <Document
                file={pdfSource}
                onLoadSuccess={onDocumentLoadSuccess}
                onLoadError={onDocumentLoadError}
                loading=""
              >
                {Array.from(new Array(numPages), (el, index) => (
                  <div key={`page_${index + 1}`} className="mb-4">
                    <Page
                      pageNumber={index + 1}
                      scale={scale}
                      rotate={rotation}
                      className="shadow-lg"
                    />
                  </div>
                ))}
              </Document>
            </div>
          )}
        </div>
      )}

      {/* Page Navigation */}
      {showPreview && numPages && numPages > 1 && (
        <div className="border-t border-gray-200 p-3">
          <div className="flex items-center justify-center space-x-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPageNumber(prev => Math.max(prev - 1, 1))}
              disabled={pageNumber <= 1}
            >
              Previous
            </Button>

            <span className="text-sm text-gray-600">
              Page {pageNumber} of {numPages}
            </span>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setPageNumber(prev => Math.min(prev + 1, numPages))}
              disabled={pageNumber >= numPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Status Indicator */}
      <div className="border-t border-gray-200 p-3 bg-gray-50 rounded-b-lg">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <span>PDF ready for download and sharing</span>
          </div>
          <div>
            Estimate #{estimate.id}
          </div>
        </div>
      </div>

      {/* Email Modal */}
      <EmailModal
        isOpen={emailModalOpen}
        onClose={() => setEmailModalOpen(false)}
        onSend={handleEmailSend}
        defaultRecipients={[estimate.clientInfo.email]}
        loading={emailLoading}
      />
    </div>
  );
};
