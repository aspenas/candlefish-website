/**
 * PDF Estimate Page
 * Example implementation showing how to use the PDF generation system
 */

'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { PDFEstimateGenerator } from '@/components/ui/PDFEstimateGenerator';
import { CompanyInfo } from '@/components/ui/CompanyBranding';
import { useEstimateStore } from '@/stores/useEstimateStore';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/Button';
import { ArrowLeft, FileText } from 'lucide-react';
import Link from 'next/link';

// Sample company information
const sampleCompanyInfo: CompanyInfo = {
  name: "Paintbox Professional Services",
  address: "123 Main Street, Anytown, ST 12345",
  phone: "(555) 123-4567",
  email: "info@paintboxservices.com",
  website: "https://paintboxservices.com",
  logo: "/logo-1024.png", // Using the existing logo from public folder
  license: "LIC-12345-678",
  taxId: "12-3456789",
  insuranceInfo: {
    provider: "Professional Insurance Co.",
    policyNumber: "POL-987654321",
    expirationDate: "2025-12-31"
  },
  certifications: [
    "EPA RRP Certified",
    "Lead-Safe Certified",
    "Better Business Bureau A+ Rating",
    "Licensed & Bonded"
  ],
  foundedYear: 2010,
  tagline: "Quality Painting, Professional Results"
};

// Sample photos (would typically come from Company Cam integration)
const samplePhotos = [
  {
    id: "1",
    url: "https://images.unsplash.com/photo-1562259949-e8e7689d7828?w=400&q=80",
    description: "Exterior before painting",
    type: "before" as const,
    timestamp: new Date("2024-01-15T10:00:00Z"),
    location: {
      lat: 40.7128,
      lng: -74.0060,
      address: "123 Main Street, Anytown, ST"
    }
  },
  {
    id: "2",
    url: "https://images.unsplash.com/photo-1558618047-3c8c76e7de24?w=400&q=80",
    description: "Surface preparation work",
    type: "prep" as const,
    timestamp: new Date("2024-01-16T14:30:00Z")
  },
  {
    id: "3",
    url: "https://images.unsplash.com/photo-1581858726788-75bc0f6a952d?w=400&q=80",
    description: "Fresh paint application",
    type: "during" as const,
    timestamp: new Date("2024-01-17T11:15:00Z")
  },
  {
    id: "4",
    url: "https://images.unsplash.com/photo-1588880331179-bc9b93a8cb5e?w=400&q=80",
    description: "Completed exterior painting",
    type: "after" as const,
    timestamp: new Date("2024-01-18T16:45:00Z")
  }
];

export default function PDFEstimatePage() {
  const params = useParams();
  const estimateId = params.id as string;
  const { estimate, loadEstimate } = useEstimateStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadEstimateData = async () => {
      if (estimateId && estimateId !== 'new') {
        try {
          await loadEstimate(estimateId);
        } catch (error) {
          console.error('Failed to load estimate:', error);
        }
      }
      setLoading(false);
    };

    loadEstimateData();
  }, [estimateId, loadEstimate]);

  // Create sample estimate if none exists
  const sampleEstimate = estimate?.id ? estimate : {
    id: estimateId,
    clientInfo: {
      name: "John & Jane Smith",
      address: "123 Main Street, Anytown, ST 12345",
      phone: "(555) 987-6543",
      email: "john.smith@email.com",
      projectType: "Exterior House Painting"
    },
    measurements: [
      {
        id: "1",
        type: "exterior" as const,
        description: "Front exterior wall painting",
        dimensions: {
          length: 40,
          height: 12,
          quantity: 1
        },
        surface: "Wood siding",
        condition: "Good - minor prep work needed",
        notes: "Includes trim and shutters"
      },
      {
        id: "2",
        type: "exterior" as const,
        description: "Side and rear walls",
        dimensions: {
          length: 80,
          height: 12,
          quantity: 1
        },
        surface: "Wood siding",
        condition: "Fair - some scraping required"
      },
      {
        id: "3",
        type: "exterior" as const,
        description: "Garage door and trim",
        dimensions: {
          width: 16,
          height: 8,
          quantity: 1
        },
        surface: "Steel",
        condition: "Good"
      }
    ],
    pricing: {
      laborRate: 45,
      paintPrice: 55,
      tier: {
        name: "Better" as const,
        multiplier: 1.2,
        features: [
          "Premium paint (Sherwin Williams ProClassic)",
          "Comprehensive surface preparation",
          "Power washing included",
          "Primer application where needed",
          "Two-coat paint system",
          "Detailed trim work",
          "Professional cleanup",
          "2-year warranty on workmanship",
          "Color consultation included"
        ]
      }
    },
    calculations: {
      subtotal: 3250,
      tax: 260,
      total: 3510,
      laborHours: 28,
      paintGallons: 12
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Loading estimate...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <Link href={`/estimate/${estimateId}/review`}>
              <Button variant="outline" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Estimate
              </Button>
            </Link>
            <h1 className="text-3xl font-bold text-gray-900">
              PDF Generator
            </h1>
          </div>
        </div>

        {/* Main Content */}
        <div className="space-y-8">
          {/* Instructions Card */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Professional PDF Generation
            </h2>
            <p className="text-gray-600 mb-4">
              Generate professional PDF estimates for your clients with the following features:
            </p>
            <ul className="list-disc list-inside text-gray-600 space-y-1 mb-6">
              <li>Professional company branding and letterhead</li>
              <li>Comprehensive project details and scope of work</li>
              <li>Good/Better/Best pricing tier options</li>
              <li>Project photos and documentation</li>
              <li>Digital signature support</li>
              <li>QR codes for online estimate viewing</li>
              <li>Email delivery with tracking</li>
              <li>Print-ready formatting</li>
            </ul>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-blue-900 mb-2">
                💡 Pro Tips
              </h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Use the Premium or Professional template for high-value projects</li>
                <li>• Include project photos to showcase your professionalism</li>
                <li>• Enable signature areas for immediate approval</li>
                <li>• Generate all pricing tiers to give clients options</li>
              </ul>
            </div>
          </Card>

          {/* PDF Generator */}
          <PDFEstimateGenerator
            estimate={sampleEstimate}
            companyInfo={sampleCompanyInfo}
            photos={samplePhotos}
            onPDFGenerated={(pdfData) => {
              console.log('PDF generated:', pdfData);
              // You can add additional logic here, such as:
              // - Saving to database
              // - Updating estimate status
              // - Triggering notifications
            }}
            onEmailSent={(recipients) => {
              console.log('Email sent to:', recipients);
              // You can add additional logic here, such as:
              // - Logging email activity
              // - Updating client communication records
              // - Scheduling follow-up tasks
            }}
          />
        </div>

        {/* Development Info */}
        <Card className="mt-8 p-6 bg-gray-50 border-dashed">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Development Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-semibold text-gray-700 mb-2">API Endpoints</h4>
              <ul className="text-gray-600 space-y-1">
                <li>• POST /api/v1/pdf/generate - Generate PDF</li>
                <li>• POST /api/v1/pdf/email - Send PDF via email</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-gray-700 mb-2">Components</h4>
              <ul className="text-gray-600 space-y-1">
                <li>• PDFEstimateGenerator - Main generator</li>
                <li>• PDFViewer - Preview and actions</li>
                <li>• CompanyBranding - Branding elements</li>
                <li>• EnhancedEstimateTemplate - PDF template</li>
              </ul>
            </div>
          </div>

          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              <strong>Note:</strong> This page shows sample data for demonstration.
              In production, ensure all company information, photos, and estimate data
              are properly validated and secured.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
