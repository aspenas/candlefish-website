/**
 * Professional PDF Estimate Template
 * React PDF component for generating BART estimator PDFs
 * Supports Good/Better/Best pricing tiers and Company Cam integration
 */

import React from 'react';
import { Document, Page, View, Text, Image, StyleSheet, Font } from '@react-pdf/renderer';
import { EstimateData, PricingTier } from '../excel-engine/types';

// Register fonts
Font.register({
  family: 'Roboto',
  fonts: [
    { src: 'https://fonts.gstatic.com/s/roboto/v27/KFOmCnqEu92Fr1Mu4mxK.woff2', fontWeight: 400 },
    { src: 'https://fonts.gstatic.com/s/roboto/v27/KFOlCnqEu92Fr1MmWUlfBBc4.woff2', fontWeight: 700 },
  ],
});

// PDF Styles
const styles = StyleSheet.create({
  page: {
    fontFamily: 'Roboto',
    fontSize: 10,
    paddingTop: 35,
    paddingLeft: 35,
    paddingRight: 35,
    paddingBottom: 65,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 30,
    borderBottomWidth: 2,
    borderBottomColor: '#2563eb',
    paddingBottom: 20,
  },
  logo: {
    width: 120,
    height: 40,
  },
  companyInfo: {
    textAlign: 'right',
    fontSize: 9,
    color: '#374151',
  },
  title: {
    fontSize: 24,
    fontWeight: 700,
    color: '#1f2937',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 20,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 700,
    color: '#1f2937',
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingBottom: 5,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
    borderBottomWidth: 0.5,
    borderBottomColor: '#f3f4f6',
  },
  column: {
    flexDirection: 'column',
  },
  label: {
    fontSize: 9,
    color: '#6b7280',
    fontWeight: 600,
  },
  value: {
    fontSize: 10,
    color: '#374151',
    marginTop: 2,
  },
  table: {
    display: 'table',
    width: '100%',
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  tableRow: {
    margin: 0,
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  tableHeader: {
    backgroundColor: '#f9fafb',
    fontWeight: 700,
  },
  tableCell: {
    margin: 0,
    padding: 8,
    borderRightWidth: 1,
    borderRightColor: '#e5e7eb',
    fontSize: 9,
    textAlign: 'left',
  },
  tableCellNumber: {
    textAlign: 'right',
  },
  pricingTier: {
    padding: 15,
    marginBottom: 15,
    borderRadius: 8,
    borderWidth: 2,
  },
  pricingTierGood: {
    backgroundColor: '#f0f9ff',
    borderColor: '#0ea5e9',
  },
  pricingTierBetter: {
    backgroundColor: '#f0fdf4',
    borderColor: '#22c55e',
  },
  pricingTierBest: {
    backgroundColor: '#fefce8',
    borderColor: '#eab308',
  },
  pricingTitle: {
    fontSize: 16,
    fontWeight: 700,
    marginBottom: 8,
  },
  pricingPrice: {
    fontSize: 20,
    fontWeight: 700,
    marginBottom: 10,
  },
  pricingFeature: {
    fontSize: 9,
    marginBottom: 3,
    paddingLeft: 15,
  },
  totalSection: {
    marginTop: 30,
    padding: 20,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  totalLabel: {
    fontSize: 12,
    fontWeight: 600,
    color: '#374151',
  },
  totalValue: {
    fontSize: 12,
    fontWeight: 700,
    color: '#1f2937',
  },
  grandTotal: {
    fontSize: 16,
    fontWeight: 700,
    color: '#1f2937',
    borderTopWidth: 2,
    borderTopColor: '#374151',
    paddingTop: 8,
    marginTop: 8,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 35,
    right: 35,
    textAlign: 'center',
    fontSize: 8,
    color: '#6b7280',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 10,
  },
  pageNumber: {
    position: 'absolute',
    fontSize: 8,
    bottom: 30,
    left: 0,
    right: 0,
    textAlign: 'center',
    color: '#9ca3af',
  },
  qrCode: {
    width: 60,
    height: 60,
    marginLeft: 20,
  },
  workDescription: {
    fontSize: 9,
    lineHeight: 1.4,
    color: '#4b5563',
    marginBottom: 5,
  },
  photoContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 15,
  },
  photo: {
    width: 80,
    height: 60,
    marginRight: 10,
    marginBottom: 10,
    borderRadius: 4,
  },
  warrantyBox: {
    padding: 15,
    backgroundColor: '#fef3c7',
    borderRadius: 8,
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#f59e0b',
  },
  warrantyTitle: {
    fontSize: 12,
    fontWeight: 700,
    color: '#92400e',
    marginBottom: 8,
  },
  warrantyText: {
    fontSize: 9,
    color: '#92400e',
    lineHeight: 1.3,
  },
});

interface EstimateTemplateProps {
  estimate: EstimateData;
  companyInfo: {
    name: string;
    address: string;
    phone: string;
    email: string;
    website: string;
    logo?: string;
    license?: string;
  };
  photos?: Array<{
    url: string;
    description: string;
    type: 'before' | 'during' | 'after';
  }>;
  qrCodeUrl?: string;
}

const EstimateTemplate: React.FC<EstimateTemplateProps> = ({
  estimate,
  companyInfo,
  photos = [],
  qrCodeUrl
}) => {
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (date: Date = new Date()): string => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getPricingTierStyle = (tier: PricingTier['name']) => {
    switch (tier) {
      case 'Good':
        return styles.pricingTierGood;
      case 'Better':
        return styles.pricingTierBetter;
      case 'Best':
        return styles.pricingTierBest;
      default:
        return styles.pricingTierGood;
    }
  };

  const getPricingTierColor = (tier: PricingTier['name']) => {
    switch (tier) {
      case 'Good':
        return '#0ea5e9';
      case 'Better':
        return '#22c55e';
      case 'Best':
        return '#eab308';
      default:
        return '#0ea5e9';
    }
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            {companyInfo.logo && (
              <Image src={companyInfo.logo} style={styles.logo} />
            )}
          </View>
          <View style={styles.companyInfo}>
            <Text style={{ fontSize: 12, fontWeight: 700, color: '#1f2937' }}>
              {companyInfo.name}
            </Text>
            <Text>{companyInfo.address}</Text>
            <Text>{companyInfo.phone}</Text>
            <Text>{companyInfo.email}</Text>
            <Text>{companyInfo.website}</Text>
            {companyInfo.license && (
              <Text style={{ marginTop: 5, fontSize: 8 }}>License: {companyInfo.license}</Text>
            )}
          </View>
        </View>

        {/* Title */}
        <View style={styles.section}>
          <Text style={styles.title}>Painting Estimate</Text>
          <Text style={styles.subtitle}>Professional painting services estimate - {formatDate()}</Text>
        </View>

        {/* Client Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Client Information</Text>
          <View style={styles.row}>
            <View style={styles.column}>
              <Text style={styles.label}>Name</Text>
              <Text style={styles.value}>{estimate.clientInfo.name}</Text>
            </View>
            <View style={styles.column}>
              <Text style={styles.label}>Phone</Text>
              <Text style={styles.value}>{estimate.clientInfo.phone}</Text>
            </View>
          </View>
          <View style={styles.row}>
            <View style={styles.column}>
              <Text style={styles.label}>Address</Text>
              <Text style={styles.value}>{estimate.clientInfo.address}</Text>
            </View>
            <View style={styles.column}>
              <Text style={styles.label}>Email</Text>
              <Text style={styles.value}>{estimate.clientInfo.email}</Text>
            </View>
          </View>
          <View style={styles.row}>
            <View style={styles.column}>
              <Text style={styles.label}>Project Type</Text>
              <Text style={styles.value}>{estimate.clientInfo.projectType}</Text>
            </View>
            <View style={styles.column}>
              <Text style={styles.label}>Estimate Date</Text>
              <Text style={styles.value}>{formatDate()}</Text>
            </View>
          </View>
        </View>

        {/* Work Description */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Scope of Work</Text>
          {estimate.measurements.map((measurement, index) => (
            <View key={index} style={{ marginBottom: 8 }}>
              <Text style={styles.workDescription}>
                • {measurement.description}
                {measurement.dimensions && (
                  ` - ${Object.entries(measurement.dimensions)
                    .filter(([, value]) => value && value > 0)
                    .map(([key, value]) => `${key}: ${value}`)
                    .join(', ')}`
                )}
                {measurement.surface && ` (${measurement.surface})`}
                {measurement.condition && ` - Condition: ${measurement.condition}`}
              </Text>
              {measurement.notes && (
                <Text style={{ ...styles.workDescription, fontSize: 8, color: '#6b7280', marginLeft: 15 }}>
                  Note: {measurement.notes}
                </Text>
              )}
            </View>
          ))}
        </View>

        {/* Photos */}
        {photos.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Project Photos</Text>
            <View style={styles.photoContainer}>
              {photos.slice(0, 8).map((photo, index) => (
                <View key={index}>
                  <Image src={photo.url} style={styles.photo} />
                  <Text style={{ fontSize: 7, textAlign: 'center', width: 80, color: '#6b7280' }}>
                    {photo.description}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Pricing Tier */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Selected Package</Text>
          <View style={[styles.pricingTier, getPricingTierStyle(estimate.pricing.tier.name)]}>
            <Text style={[styles.pricingTitle, { color: getPricingTierColor(estimate.pricing.tier.name) }]}>
              {estimate.pricing.tier.name} Package
            </Text>
            <Text style={[styles.pricingPrice, { color: getPricingTierColor(estimate.pricing.tier.name) }]}>
              {formatCurrency(estimate.calculations.total)}
            </Text>
            <Text style={{ fontSize: 10, color: '#4b5563', marginBottom: 10 }}>Package includes:</Text>
            {estimate.pricing.tier.features.map((feature, index) => (
              <Text key={index} style={styles.pricingFeature}>• {feature}</Text>
            ))}
          </View>
        </View>
      </Page>

      {/* Second Page - Detailed Breakdown */}
      <Page size="A4" style={styles.page}>
        {/* Cost Breakdown */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cost Breakdown</Text>
          <View style={styles.table}>
            <View style={[styles.tableRow, styles.tableHeader]}>
              <Text style={[styles.tableCell, { width: '50%' }]}>Description</Text>
              <Text style={[styles.tableCell, { width: '15%' }]}>Qty</Text>
              <Text style={[styles.tableCell, { width: '15%' }]}>Rate</Text>
              <Text style={[styles.tableCell, { width: '20%' }]}>Amount</Text>
            </View>

            {/* Labor */}
            <View style={styles.tableRow}>
              <Text style={[styles.tableCell, { width: '50%' }]}>Professional Painting Labor</Text>
              <Text style={[styles.tableCell, { width: '15%' }, styles.tableCellNumber]}>
                {estimate.calculations.laborHours.toFixed(1)} hrs
              </Text>
              <Text style={[styles.tableCell, { width: '15%' }, styles.tableCellNumber]}>
                {formatCurrency(estimate.pricing.laborRate)}
              </Text>
              <Text style={[styles.tableCell, { width: '20%' }, styles.tableCellNumber]}>
                {formatCurrency(estimate.calculations.laborHours * estimate.pricing.laborRate)}
              </Text>
            </View>

            {/* Materials */}
            <View style={styles.tableRow}>
              <Text style={[styles.tableCell, { width: '50%' }]}>Premium Paint & Materials</Text>
              <Text style={[styles.tableCell, { width: '15%' }, styles.tableCellNumber]}>
                {estimate.calculations.paintGallons.toFixed(1)} gal
              </Text>
              <Text style={[styles.tableCell, { width: '15%' }, styles.tableCellNumber]}>
                {formatCurrency(estimate.pricing.paintPrice)}
              </Text>
              <Text style={[styles.tableCell, { width: '20%' }, styles.tableCellNumber]}>
                {formatCurrency(estimate.calculations.paintGallons * estimate.pricing.paintPrice)}
              </Text>
            </View>

            {/* Additional items based on measurements */}
            {estimate.measurements.map((measurement, index) => {
              if (measurement.type === 'exterior' && measurement.description.includes('prep')) {
                return (
                  <View key={index} style={styles.tableRow}>
                    <Text style={[styles.tableCell, { width: '50%' }]}>Surface Preparation</Text>
                    <Text style={[styles.tableCell, { width: '15%' }, styles.tableCellNumber]}>1</Text>
                    <Text style={[styles.tableCell, { width: '15%' }, styles.tableCellNumber]}>Included</Text>
                    <Text style={[styles.tableCell, { width: '20%' }, styles.tableCellNumber]}>Included</Text>
                  </View>
                );
              }
              return null;
            })}
          </View>
        </View>

        {/* Total Section */}
        <View style={styles.totalSection}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal</Text>
            <Text style={styles.totalValue}>{formatCurrency(estimate.calculations.subtotal)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Tax ({((estimate.calculations.tax / estimate.calculations.subtotal) * 100).toFixed(1)}%)</Text>
            <Text style={styles.totalValue}>{formatCurrency(estimate.calculations.tax)}</Text>
          </View>
          <View style={[styles.totalRow, styles.grandTotal]}>
            <Text style={[styles.totalLabel, { fontSize: 16 }]}>Total Investment</Text>
            <Text style={[styles.totalValue, { fontSize: 16 }]}>{formatCurrency(estimate.calculations.total)}</Text>
          </View>
        </View>

        {/* Warranty Information */}
        <View style={styles.warrantyBox}>
          <Text style={styles.warrantyTitle}>Our Guarantee</Text>
          <Text style={styles.warrantyText}>
            We stand behind our work with a comprehensive warranty:
          </Text>
          <Text style={[styles.warrantyText, { marginTop: 5, marginLeft: 10 }]}>• 2-year warranty on all exterior painting</Text>
          <Text style={[styles.warrantyText, { marginLeft: 10 }]}>• 3-year warranty on all interior painting</Text>
          <Text style={[styles.warrantyText, { marginLeft: 10 }]}>• Lifetime warranty on craftsmanship</Text>
          <Text style={[styles.warrantyText, { marginLeft: 10 }]}>• 100% satisfaction guarantee</Text>
        </View>

        {/* Terms and Conditions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Terms & Conditions</Text>
          <View style={{ fontSize: 8, lineHeight: 1.3, color: '#4b5563' }}>
            <Text>• Estimate valid for 30 days from date of issue</Text>
            <Text>• 50% deposit required to begin work, balance due upon completion</Text>
            <Text>• Work to be completed according to industry standards</Text>
            <Text>• Color changes after work begins may incur additional charges</Text>
            <Text>• Weather conditions may affect exterior work scheduling</Text>
            <Text>• Client responsible for moving furniture and personal items</Text>
            <Text>• Additional costs may apply for extra prep work not included in original scope</Text>
          </View>
        </View>

        {/* Footer with QR Code */}
        <View style={styles.footer}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View>
              <Text style={{ fontSize: 10, fontWeight: 700, color: '#1f2937' }}>Ready to get started?</Text>
              <Text>Call us at {companyInfo.phone} or visit {companyInfo.website}</Text>
              <Text>Thank you for choosing {companyInfo.name} for your painting needs!</Text>
            </View>
            {qrCodeUrl && (
              <View style={{ alignItems: 'center' }}>
                <Image src={qrCodeUrl} style={styles.qrCode} />
                <Text style={{ fontSize: 7, marginTop: 5 }}>Scan to view online</Text>
              </View>
            )}
          </View>
        </View>

        {/* Page Numbers */}
        <Text style={styles.pageNumber} render={({ pageNumber, totalPages }) => (
          `Page ${pageNumber} of ${totalPages}`
        )} fixed />
      </Page>
    </Document>
  );
};

export default EstimateTemplate;
