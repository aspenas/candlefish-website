/**
 * PDF Generation API Endpoint
 * POST /api/v1/pdf/generate
 */

import { NextRequest, NextResponse } from 'next/server';
// Conditional import to handle missing dependencies
let pdfGenerationService: any = null;
try {
  pdfGenerationService = require('@/lib/services/pdf-generation-service').pdfGenerationService;
} catch (error) {
  console.warn('PDF generation service not available:', error);
}
import { z } from 'zod';

// Request validation schema
const generatePDFSchema = z.object({
  estimate: z.object({
    id: z.string().optional(),
    clientInfo: z.object({
      name: z.string().min(1, 'Client name is required'),
      address: z.string(),
      phone: z.string(),
      email: z.string().email(),
      projectType: z.string()
    }),
    measurements: z.array(z.object({
      id: z.string(),
      type: z.enum(['exterior', 'interior', 'cabinet', 'gutter', 'holiday']),
      description: z.string(),
      dimensions: z.object({
        length: z.number().optional(),
        width: z.number().optional(),
        height: z.number().optional(),
        quantity: z.number().optional()
      }),
      surface: z.string().optional(),
      condition: z.string().optional(),
      notes: z.string().optional()
    })),
    pricing: z.object({
      laborRate: z.number().positive(),
      paintPrice: z.number().positive(),
      tier: z.object({
        name: z.enum(['Good', 'Better', 'Best']),
        multiplier: z.number().positive(),
        features: z.array(z.string())
      })
    }),
    calculations: z.object({
      subtotal: z.number().positive(),
      tax: z.number().min(0),
      total: z.number().positive(),
      laborHours: z.number().positive(),
      paintGallons: z.number().positive()
    })
  }),
  companyInfo: z.object({
    name: z.string().min(1, 'Company name is required'),
    address: z.string(),
    phone: z.string(),
    email: z.string().email(),
    website: z.string().url(),
    logo: z.string().url().optional(),
    license: z.string().optional(),
    taxId: z.string().optional(),
    insuranceInfo: z.object({
      provider: z.string(),
      policyNumber: z.string(),
      expirationDate: z.string()
    }).optional()
  }),
  photos: z.array(z.object({
    id: z.string(),
    url: z.string().url(),
    description: z.string(),
    type: z.enum(['before', 'during', 'after', 'damage', 'prep']),
    timestamp: z.string().datetime(),
    location: z.object({
      lat: z.number(),
      lng: z.number(),
      address: z.string().optional()
    }).optional(),
    annotations: z.array(z.object({
      x: z.number(),
      y: z.number(),
      text: z.string()
    })).optional()
  })).optional(),
  signature: z.object({
    clientSignature: z.object({
      dataUrl: z.string(),
      signedAt: z.string().datetime(),
      signedBy: z.string(),
      ipAddress: z.string().optional()
    }).optional(),
    contractorSignature: z.object({
      dataUrl: z.string(),
      signedAt: z.string().datetime(),
      signedBy: z.string()
    }).optional()
  }).optional(),
  qrCodeData: z.object({
    url: z.string().url(),
    text: z.string().optional(),
    size: z.number().int().min(100).max(500).optional(),
    color: z.string().optional()
  }).optional(),
  watermark: z.string().optional(),
  template: z.enum(['standard', 'premium', 'professional']).optional(),
  storage: z.enum(['local', 's3', 'cloudinary']).optional(),
  returnType: z.enum(['buffer', 'url', 'base64']).optional()
});

export async function POST(request: NextRequest) {
  try {
    // Check if PDF service is available
    if (!pdfGenerationService) {
      return NextResponse.json(
        {
          error: 'PDF generation service not available',
          message: 'Required dependencies are not installed. Please install @aws-sdk/client-s3 and cloudinary.'
        },
        { status: 503 }
      );
    }

    const body = await request.json();

    // Validate request data
    const validationResult = generatePDFSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validationResult.error.errors
        },
        { status: 400 }
      );
    }

    const {
      estimate,
      companyInfo,
      photos = [],
      signature,
      qrCodeData,
      watermark,
      template = 'standard',
      storage = 'local',
      returnType = 'url'
    } = validationResult.data;

    // Additional validation using service
    const validationErrors = pdfGenerationService.validateOptions({
      estimate,
      companyInfo,
      photos,
      signature,
      qrCodeData,
      watermark,
      template
    });

    if (validationErrors.length > 0) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validationErrors
        },
        { status: 400 }
      );
    }

    // Convert string dates back to Date objects
    const processedPhotos = photos.map(photo => ({
      ...photo,
      timestamp: new Date(photo.timestamp)
    }));

    const processedSignature = signature ? {
      clientSignature: signature.clientSignature ? {
        ...signature.clientSignature,
        signedAt: new Date(signature.clientSignature.signedAt)
      } : undefined,
      contractorSignature: signature.contractorSignature ? {
        ...signature.contractorSignature,
        signedAt: new Date(signature.contractorSignature.signedAt)
      } : undefined
    } : undefined;

    // Generate PDF based on return type
    if (returnType === 'buffer') {
      const { buffer, metadata } = await pdfGenerationService.generatePDF({
        estimate,
        companyInfo,
        photos: processedPhotos,
        signature: processedSignature,
        qrCodeData,
        watermark,
        template
      });

      return new NextResponse(buffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="estimate-${estimate.clientInfo.name}-${Date.now()}.pdf"`,
          'X-PDF-Metadata': JSON.stringify(metadata)
        }
      });
    }

    if (returnType === 'base64') {
      const { buffer, metadata } = await pdfGenerationService.generatePDF({
        estimate,
        companyInfo,
        photos: processedPhotos,
        signature: processedSignature,
        qrCodeData,
        watermark,
        template
      });

      return NextResponse.json({
        success: true,
        data: {
          base64: buffer.toString('base64'),
          metadata
        }
      });
    }

    // Default: save to storage and return URL
    const { url, metadata } = await pdfGenerationService.generateAndSavePDF({
      estimate,
      companyInfo,
      photos: processedPhotos,
      signature: processedSignature,
      qrCodeData,
      watermark,
      template
    }, storage);

    return NextResponse.json({
      success: true,
      data: {
        url,
        metadata
      }
    });

  } catch (error) {
    console.error('PDF generation API error:', error);

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error.message,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
