/**
 * PDF Generation Service
 * Professional PDF generation for Paintbox estimates with signature support
 */

import { pdf } from '@react-pdf/renderer';
import { v4 as uuidv4 } from 'uuid';
import EstimateTemplate from '../pdf/estimate-template';
import { EstimateData } from '../excel-engine/types';

export interface PDFGenerationOptions {
  estimate: EstimateData;
  companyInfo: CompanyInfo;
  photos?: EstimatePhoto[];
  signature?: SignatureData;
  qrCodeData?: QRCodeData;
  watermark?: string;
  template?: 'standard' | 'premium' | 'professional';
}

export interface CompanyInfo {
  name: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  logo?: string;
  license?: string;
  taxId?: string;
  insuranceInfo?: {
    provider: string;
    policyNumber: string;
    expirationDate: string;
  };
}

export interface EstimatePhoto {
  id: string;
  url: string;
  description: string;
  type: 'before' | 'during' | 'after' | 'damage' | 'prep';
  timestamp: Date;
  location?: {
    lat: number;
    lng: number;
    address?: string;
  };
  annotations?: {
    x: number;
    y: number;
    text: string;
  }[];
}

export interface SignatureData {
  clientSignature?: {
    dataUrl: string;
    signedAt: Date;
    signedBy: string;
    ipAddress?: string;
  };
  contractorSignature?: {
    dataUrl: string;
    signedAt: Date;
    signedBy: string;
  };
}

export interface QRCodeData {
  url: string;
  text?: string;
  size?: number;
  color?: string;
}

export interface PDFMetadata {
  id: string;
  estimateId: string;
  generatedAt: Date;
  version: string;
  checksum: string;
  fileSize: number;
  pages: number;
}

class PDFGenerationService {
  private static instance: PDFGenerationService;
  private readonly baseUrl: string;

  private constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  }

  public static getInstance(): PDFGenerationService {
    if (!PDFGenerationService.instance) {
      PDFGenerationService.instance = new PDFGenerationService();
    }
    return PDFGenerationService.instance;
  }

  /**
   * Generate PDF buffer from estimate data
   */
  async generatePDF(options: PDFGenerationOptions): Promise<{
    buffer: Buffer;
    metadata: PDFMetadata;
  }> {
    try {
      const startTime = Date.now();

      // Generate QR code if not provided
      let qrCodeUrl = options.qrCodeData?.url;
      if (!qrCodeUrl && options.estimate.id) {
        qrCodeUrl = await this.generateQRCode({
          url: `${this.baseUrl}/estimate/${options.estimate.id}`,
          size: 200,
          color: '#2563eb'
        });
      }

      // Create PDF document
      const pdfDocument = EstimateTemplate({
        estimate: options.estimate,
        companyInfo: options.companyInfo,
        photos: options.photos || [],
        qrCodeUrl,
        signature: options.signature,
        watermark: options.watermark,
        template: options.template || 'standard'
      });

      // Generate PDF buffer
      const buffer = await pdf(pdfDocument).toBuffer();

      // Create metadata
      const metadata: PDFMetadata = {
        id: uuidv4(),
        estimateId: options.estimate.id || uuidv4(),
        generatedAt: new Date(),
        version: '1.0',
        checksum: await this.calculateChecksum(buffer),
        fileSize: buffer.length,
        pages: 2, // Standard estimate is 2 pages
      };

      const generationTime = Date.now() - startTime;

      // Log generation metrics
      console.log(`PDF generated in ${generationTime}ms`, {
        estimateId: metadata.estimateId,
        fileSize: metadata.fileSize,
        pages: metadata.pages
      });

      return { buffer, metadata };

    } catch (error) {
      console.error('PDF generation failed:', error);
      throw new Error(`PDF generation failed: ${error.message}`);
    }
  }

  /**
   * Generate PDF and save to storage
   */
  async generateAndSavePDF(
    options: PDFGenerationOptions,
    storage: 'local' | 's3' | 'cloudinary' = 'local'
  ): Promise<{
    url: string;
    metadata: PDFMetadata;
  }> {
    const { buffer, metadata } = await this.generatePDF(options);

    let url: string;

    switch (storage) {
      case 's3':
        url = await this.saveToS3(buffer, metadata);
        break;
      case 'cloudinary':
        url = await this.saveToCloudinary(buffer, metadata);
        break;
      default:
        url = await this.saveLocally(buffer, metadata);
    }

    return { url, metadata };
  }

  /**
   * Generate QR code for estimate viewing
   */
  private async generateQRCode(qrData: QRCodeData): Promise<string> {
    try {
      // Use QR code generation API or service
      const qrCodeApiUrl = `https://api.qrserver.com/v1/create-qr-code/`;
      const params = new URLSearchParams({
        size: `${qrData.size || 200}x${qrData.size || 200}`,
        data: qrData.url,
        color: qrData.color?.replace('#', '') || '000000',
        bgcolor: 'ffffff',
        format: 'png'
      });

      return `${qrCodeApiUrl}?${params.toString()}`;
    } catch (error) {
      console.error('QR code generation failed:', error);
      return ''; // Return empty string if QR generation fails
    }
  }

  /**
   * Calculate checksum for PDF integrity
   */
  private async calculateChecksum(buffer: Buffer): Promise<string> {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  /**
   * Save PDF to local storage
   */
  private async saveLocally(buffer: Buffer, metadata: PDFMetadata): Promise<string> {
    const fs = require('fs').promises;
    const path = require('path');

    const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'pdfs');

    // Ensure directory exists
    await fs.mkdir(uploadsDir, { recursive: true });

    const filename = `estimate-${metadata.estimateId}-${Date.now()}.pdf`;
    const filepath = path.join(uploadsDir, filename);

    await fs.writeFile(filepath, buffer);

    return `/uploads/pdfs/${filename}`;
  }

  /**
   * Save PDF to AWS S3
   */
  private async saveToS3(buffer: Buffer, metadata: PDFMetadata): Promise<string> {
    try {
      const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
      const s3Client = new S3Client({ region: process.env.AWS_REGION });

      const bucketName = process.env.AWS_S3_BUCKET_NAME;
      const key = `estimates/pdfs/${metadata.estimateId}/${metadata.id}.pdf`;

      const command = new PutObjectCommand({
        Bucket: bucketName,
        Key: key,
        Body: buffer,
        ContentType: 'application/pdf',
        Metadata: {
          estimateId: metadata.estimateId,
          generatedAt: metadata.generatedAt.toISOString(),
          checksum: metadata.checksum
        }
      });

      await s3Client.send(command);

      return `https://${bucketName}.s3.amazonaws.com/${key}`;
    } catch (error) {
      console.error('S3 upload failed:', error);
      // Fallback to local storage
      return this.saveLocally(buffer, metadata);
    }
  }

  /**
   * Save PDF to Cloudinary
   */
  private async saveToCloudinary(buffer: Buffer, metadata: PDFMetadata): Promise<string> {
    try {
      const cloudinary = require('cloudinary').v2;

      cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
      });

      const result = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            resource_type: 'raw',
            public_id: `estimates/pdfs/${metadata.estimateId}/${metadata.id}`,
            format: 'pdf',
            tags: ['estimate', 'pdf', metadata.estimateId]
          },
          (error: any, result: any) => {
            if (error) reject(error);
            else resolve(result);
          }
        );

        uploadStream.end(buffer);
      });

      return (result as any).secure_url;
    } catch (error) {
      console.error('Cloudinary upload failed:', error);
      // Fallback to local storage
      return this.saveLocally(buffer, metadata);
    }
  }

  /**
   * Generate PDF with digital signature support
   */
  async generateSignedPDF(
    options: PDFGenerationOptions,
    certificatePath?: string
  ): Promise<{
    buffer: Buffer;
    metadata: PDFMetadata;
  }> {
    // For digital signatures, we would typically use a library like pdf-lib
    // This is a placeholder implementation
    const result = await this.generatePDF(options);

    // TODO: Implement digital signature with certificate
    // This would require PDF-lib or similar for proper digital signatures

    return result;
  }

  /**
   * Generate multiple pricing tier PDFs
   */
  async generatePricingTierPDFs(
    baseOptions: Omit<PDFGenerationOptions, 'estimate'>,
    estimateWithTiers: {
      good: EstimateData;
      better: EstimateData;
      best: EstimateData;
    }
  ): Promise<{
    good: { buffer: Buffer; metadata: PDFMetadata };
    better: { buffer: Buffer; metadata: PDFMetadata };
    best: { buffer: Buffer; metadata: PDFMetadata };
  }> {
    const [good, better, best] = await Promise.all([
      this.generatePDF({ ...baseOptions, estimate: estimateWithTiers.good }),
      this.generatePDF({ ...baseOptions, estimate: estimateWithTiers.better }),
      this.generatePDF({ ...baseOptions, estimate: estimateWithTiers.best })
    ]);

    return { good, better, best };
  }

  /**
   * Validate PDF options before generation
   */
  validateOptions(options: PDFGenerationOptions): string[] {
    const errors: string[] = [];

    if (!options.estimate) {
      errors.push('Estimate data is required');
    }

    if (!options.companyInfo) {
      errors.push('Company information is required');
    }

    if (options.estimate && !options.estimate.clientInfo?.name) {
      errors.push('Client name is required');
    }

    if (options.estimate && !options.estimate.calculations?.total) {
      errors.push('Estimate total is required');
    }

    return errors;
  }
}

export const pdfGenerationService = PDFGenerationService.getInstance();
