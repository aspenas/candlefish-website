/**
 * Company Branding Components
 * Professional branding elements for PDFs and documents
 */

'use client';

import React from 'react';
import { Building2, Mail, Phone, Globe, Shield, Award } from 'lucide-react';

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
  certifications?: string[];
  foundedYear?: number;
  tagline?: string;
}

interface CompanyBrandingProps {
  companyInfo: CompanyInfo;
  variant?: 'full' | 'minimal' | 'header' | 'footer';
  showCredentials?: boolean;
  className?: string;
}

// Main branding component
export const CompanyBranding: React.FC<CompanyBrandingProps> = ({
  companyInfo,
  variant = 'full',
  showCredentials = true,
  className = ''
}) => {
  const {
    name,
    address,
    phone,
    email,
    website,
    logo,
    license,
    taxId,
    insuranceInfo,
    certifications = [],
    foundedYear,
    tagline
  } = companyInfo;

  if (variant === 'minimal') {
    return (
      <div className={`flex items-center space-x-3 ${className}`}>
        {logo ? (
          <img src={logo} alt={name} className="h-8 w-auto" />
        ) : (
          <Building2 className="h-8 w-8 text-blue-600" />
        )}
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{name}</h3>
          {tagline && <p className="text-sm text-gray-600">{tagline}</p>}
        </div>
      </div>
    );
  }

  if (variant === 'header') {
    return (
      <div className={`flex justify-between items-start ${className}`}>
        <div className="flex items-center space-x-4">
          {logo ? (
            <img src={logo} alt={name} className="h-12 w-auto" />
          ) : (
            <Building2 className="h-12 w-12 text-blue-600" />
          )}
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{name}</h1>
            {tagline && <p className="text-gray-600 mt-1">{tagline}</p>}
          </div>
        </div>

        <div className="text-right text-sm text-gray-600">
          <div className="flex items-center justify-end space-x-1 mb-1">
            <Phone className="h-4 w-4" />
            <span>{phone}</span>
          </div>
          <div className="flex items-center justify-end space-x-1 mb-1">
            <Mail className="h-4 w-4" />
            <span>{email}</span>
          </div>
          <div className="flex items-center justify-end space-x-1">
            <Globe className="h-4 w-4" />
            <span>{website}</span>
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'footer') {
    return (
      <div className={`border-t border-gray-200 pt-4 ${className}`}>
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-3">
            {logo ? (
              <img src={logo} alt={name} className="h-8 w-auto" />
            ) : (
              <Building2 className="h-8 w-8 text-blue-600" />
            )}
            <div>
              <h4 className="font-semibold text-gray-900">{name}</h4>
              <p className="text-sm text-gray-600">{address}</p>
            </div>
          </div>

          <div className="text-right text-sm text-gray-600">
            <div>{phone} • {email}</div>
            <div>{website}</div>
            {showCredentials && license && (
              <div className="mt-1 text-xs">License: {license}</div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Full variant
  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center space-x-4">
          {logo ? (
            <img src={logo} alt={name} className="h-16 w-auto" />
          ) : (
            <Building2 className="h-16 w-16 text-blue-600" />
          )}
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{name}</h2>
            {tagline && <p className="text-gray-600 mt-1">{tagline}</p>}
            {foundedYear && (
              <p className="text-sm text-gray-500 mt-1">
                Serving clients since {foundedYear}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Contact Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
            Contact Information
          </h3>

          <div className="flex items-center space-x-2 text-gray-600">
            <Building2 className="h-4 w-4" />
            <span>{address}</span>
          </div>

          <div className="flex items-center space-x-2 text-gray-600">
            <Phone className="h-4 w-4" />
            <span>{phone}</span>
          </div>

          <div className="flex items-center space-x-2 text-gray-600">
            <Mail className="h-4 w-4" />
            <span>{email}</span>
          </div>

          <div className="flex items-center space-x-2 text-gray-600">
            <Globe className="h-4 w-4" />
            <span>{website}</span>
          </div>
        </div>

        {showCredentials && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
              Credentials & Insurance
            </h3>

            {license && (
              <div className="flex items-center space-x-2 text-gray-600">
                <Shield className="h-4 w-4" />
                <span>License: {license}</span>
              </div>
            )}

            {taxId && (
              <div className="flex items-center space-x-2 text-gray-600">
                <Building2 className="h-4 w-4" />
                <span>Tax ID: {taxId}</span>
              </div>
            )}

            {insuranceInfo && (
              <div className="space-y-1">
                <div className="flex items-center space-x-2 text-gray-600">
                  <Shield className="h-4 w-4" />
                  <span>Insured by {insuranceInfo.provider}</span>
                </div>
                <div className="text-sm text-gray-500 ml-6">
                  Policy: {insuranceInfo.policyNumber}
                </div>
                <div className="text-sm text-gray-500 ml-6">
                  Expires: {insuranceInfo.expirationDate}
                </div>
              </div>
            )}

            {certifications.length > 0 && (
              <div className="space-y-1">
                <div className="flex items-center space-x-2 text-gray-600">
                  <Award className="h-4 w-4" />
                  <span>Certifications:</span>
                </div>
                <div className="ml-6 space-y-1">
                  {certifications.map((cert, index) => (
                    <div key={index} className="text-sm text-gray-500">
                      • {cert}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// Specialized logo component
export const CompanyLogo: React.FC<{
  companyInfo: CompanyInfo;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showName?: boolean;
  className?: string;
}> = ({
  companyInfo,
  size = 'md',
  showName = true,
  className = ''
}) => {
  const sizeClasses = {
    sm: 'h-6 w-auto',
    md: 'h-8 w-auto',
    lg: 'h-12 w-auto',
    xl: 'h-16 w-auto'
  };

  const iconSizeClasses = {
    sm: 'h-6 w-6',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
    xl: 'h-16 w-16'
  };

  const textSizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl'
  };

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      {companyInfo.logo ? (
        <img
          src={companyInfo.logo}
          alt={companyInfo.name}
          className={sizeClasses[size]}
        />
      ) : (
        <Building2 className={`${iconSizeClasses[size]} text-blue-600`} />
      )}

      {showName && (
        <div>
          <h3 className={`font-semibold text-gray-900 ${textSizeClasses[size]}`}>
            {companyInfo.name}
          </h3>
          {companyInfo.tagline && size !== 'sm' && (
            <p className="text-xs text-gray-600">{companyInfo.tagline}</p>
          )}
        </div>
      )}
    </div>
  );
};

// Letterhead component for documents
export const CompanyLetterhead: React.FC<{
  companyInfo: CompanyInfo;
  className?: string;
}> = ({ companyInfo, className = '' }) => {
  return (
    <div className={`border-b-2 border-blue-600 pb-4 mb-6 ${className}`}>
      <div className="flex justify-between items-start">
        <div className="flex items-center space-x-4">
          {companyInfo.logo ? (
            <img
              src={companyInfo.logo}
              alt={companyInfo.name}
              className="h-12 w-auto"
            />
          ) : (
            <Building2 className="h-12 w-12 text-blue-600" />
          )}

          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {companyInfo.name}
            </h1>
            {companyInfo.tagline && (
              <p className="text-lg text-gray-600 mt-1">
                {companyInfo.tagline}
              </p>
            )}
          </div>
        </div>

        <div className="text-right text-sm text-gray-600 space-y-1">
          <div>{companyInfo.address}</div>
          <div>{companyInfo.phone}</div>
          <div>{companyInfo.email}</div>
          <div>{companyInfo.website}</div>
          {companyInfo.license && (
            <div className="text-xs text-gray-500 mt-2">
              License: {companyInfo.license}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Business card component
export const BusinessCard: React.FC<{
  companyInfo: CompanyInfo;
  contactPerson?: {
    name: string;
    title: string;
    phone?: string;
    email?: string;
  };
  className?: string;
}> = ({ companyInfo, contactPerson, className = '' }) => {
  return (
    <div className={`bg-gradient-to-br from-blue-600 to-blue-800 text-white p-6 rounded-lg shadow-lg max-w-sm ${className}`}>
      <div className="flex items-center justify-between mb-4">
        {companyInfo.logo ? (
          <img
            src={companyInfo.logo}
            alt={companyInfo.name}
            className="h-8 w-auto filter brightness-0 invert"
          />
        ) : (
          <Building2 className="h-8 w-8 text-white" />
        )}
      </div>

      <div className="mb-4">
        <h3 className="text-xl font-bold">{companyInfo.name}</h3>
        {companyInfo.tagline && (
          <p className="text-blue-200 text-sm">{companyInfo.tagline}</p>
        )}
      </div>

      {contactPerson && (
        <div className="mb-4 border-t border-blue-500 pt-4">
          <h4 className="font-semibold">{contactPerson.name}</h4>
          <p className="text-blue-200 text-sm">{contactPerson.title}</p>
          {contactPerson.phone && (
            <p className="text-sm">{contactPerson.phone}</p>
          )}
          {contactPerson.email && (
            <p className="text-sm">{contactPerson.email}</p>
          )}
        </div>
      )}

      <div className="text-sm space-y-1">
        <div>{companyInfo.phone}</div>
        <div>{companyInfo.email}</div>
        <div>{companyInfo.website}</div>
      </div>

      {companyInfo.license && (
        <div className="mt-4 pt-4 border-t border-blue-500 text-xs text-blue-200">
          License: {companyInfo.license}
        </div>
      )}
    </div>
  );
};

// Professional seal/stamp component
export const CompanySeal: React.FC<{
  companyInfo: CompanyInfo;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}> = ({ companyInfo, size = 'md', className = '' }) => {
  const sizeClasses = {
    sm: 'w-16 h-16',
    md: 'w-24 h-24',
    lg: 'w-32 h-32'
  };

  const textSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  };

  return (
    <div className={`${sizeClasses[size]} ${className}`}>
      <div className="w-full h-full rounded-full border-4 border-blue-600 flex items-center justify-center bg-blue-50">
        <div className="text-center">
          <div className={`font-bold text-blue-900 ${textSizeClasses[size]} leading-tight`}>
            {companyInfo.name.split(' ').map(word => (
              <div key={word}>{word}</div>
            ))}
          </div>
          {companyInfo.license && size !== 'sm' && (
            <div className="text-xs text-blue-700 mt-1">
              LIC: {companyInfo.license}
            </div>
          )}
          {companyInfo.foundedYear && size === 'lg' && (
            <div className="text-xs text-blue-700">
              EST. {companyInfo.foundedYear}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
