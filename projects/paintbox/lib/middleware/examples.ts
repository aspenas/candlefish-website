/**
 * Practical Usage Examples for Paintbox Security Middleware
 * These examples show how to integrate the middleware components with Next.js API routes
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  withMiddleware,
  protectedApiMiddleware,
  adminApiMiddleware,
  publicApiMiddleware,
  sensitiveApiMiddleware,
  composeMiddleware,
  createValidationMiddleware,
  authMiddleware,
  rateLimitMiddleware,
  commonSchemas,
  paintboxSchemas,
} from './index';

/**
 * Example 1: Basic Public API Endpoint with Rate Limiting
 * File: app/api/v1/estimates/calculate/route.ts
 */
export const publicEstimateCalculationExample = withMiddleware(
  publicApiMiddleware(paintboxSchemas.estimateData),
  async (request: NextRequest, { data }) => {
    // Business logic for estimate calculation
    const estimate = {
      id: 'est_123',
      totalCost: 2500.00,
      laborHours: 16,
      materials: ['primer', 'paint', 'brushes'],
      clientInfo: data.clientInfo,
    };

    return NextResponse.json({
      success: true,
      data: estimate,
    });
  }
);

/**
 * Example 2: Protected User Endpoint
 * File: app/api/v1/estimates/save/route.ts
 */
export const saveEstimateExample = withMiddleware(
  protectedApiMiddleware(z.object({
    estimateId: commonSchemas.uuid,
    estimateData: paintboxSchemas.estimateData,
    notes: commonSchemas.sanitizedString.max(2000).optional(),
  })),
  async (request: NextRequest, { user, data }) => {
    // Save estimate to database with user context
    const savedEstimate = {
      id: data.estimateId,
      userId: user.sub,
      createdAt: new Date().toISOString(),
      ...data.estimateData,
      notes: data.notes,
    };

    // Simulate database save
    console.log('Saving estimate for user:', user.email);

    return NextResponse.json({
      success: true,
      data: savedEstimate,
      message: 'Estimate saved successfully',
    });
  }
);

/**
 * Example 3: Admin-Only User Management
 * File: app/api/v1/admin/users/route.ts
 */
export const userManagementExample = {
  // GET /api/v1/admin/users - List users (admin only)
  GET: withMiddleware(
    adminApiMiddleware(z.object({
      page: z.string().transform(val => parseInt(val)).pipe(z.number().min(1)).default('1'),
      limit: z.string().transform(val => parseInt(val)).pipe(z.number().min(1).max(100)).default('20'),
      role: z.enum(['admin', 'user', 'estimator', 'readonly']).optional(),
    })),
    async (request: NextRequest, { user, data }) => {
      // Admin can list all users
      const users = [
        { id: '1', email: 'user1@example.com', role: 'user' },
        { id: '2', email: 'user2@example.com', role: 'estimator' },
      ];

      return NextResponse.json({
        success: true,
        data: users,
        pagination: {
          page: data.page,
          limit: data.limit,
          total: users.length,
        },
      });
    }
  ),

  // POST /api/v1/admin/users - Create user (admin only)
  POST: withMiddleware(
    adminApiMiddleware(paintboxSchemas.userRegistration),
    async (request: NextRequest, { user, data }) => {
      // Create new user (admin action)
      const newUser = {
        id: 'user_' + Date.now(),
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        role: data.role,
        createdAt: new Date().toISOString(),
        createdBy: user.sub,
      };

      return NextResponse.json({
        success: true,
        data: newUser,
        message: 'User created successfully',
      }, { status: 201 });
    }
  ),
};

/**
 * Example 4: Sensitive Admin Operation with Strict Security
 * File: app/api/v1/admin/users/[userId]/delete/route.ts
 */
export const deleteUserExample = withMiddleware(
  sensitiveApiMiddleware(z.object({
    userId: commonSchemas.uuid,
    confirmation: z.literal('DELETE_USER', {
      errorMap: () => ({ message: 'Must confirm deletion with "DELETE_USER"' })
    }),
    reason: commonSchemas.sanitizedString.min(10, 'Deletion reason required (min 10 characters)'),
  })),
  async (request: NextRequest, { user, data }) => {
    // Perform sensitive user deletion
    const deletedUser = {
      id: data.userId,
      deletedAt: new Date().toISOString(),
      deletedBy: user.sub,
      reason: data.reason,
    };

    // Log security event
    console.log('SECURITY: User deleted', {
      deletedUserId: data.userId,
      deletedBy: user.sub,
      reason: data.reason,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: 'User deleted successfully',
      data: deletedUser,
    });
  }
);

/**
 * Example 5: Salesforce Integration with Custom Validation
 * File: app/api/v1/integrations/salesforce/accounts/route.ts
 */
export const salesforceAccountExample = withMiddleware(
  protectedApiMiddleware(paintboxSchemas.salesforceAccountData),
  async (request: NextRequest, { user, data }) => {
    // Create Salesforce account
    const accountData = {
      ...data,
      OwnerId: user.sub, // Assign to current user
      CreatedDate: new Date().toISOString(),
    };

    // Simulate Salesforce API call
    const salesforceResponse = {
      id: 'acc_sf_123',
      success: true,
      ...accountData,
    };

    return NextResponse.json({
      success: true,
      data: salesforceResponse,
      message: 'Salesforce account created successfully',
    });
  }
);

/**
 * Example 6: Company Cam Photo Upload with File Validation
 * File: app/api/v1/integrations/companycam/photos/route.ts
 */
export const companyCamPhotoExample = withMiddleware(
  protectedApiMiddleware(z.object({
    projectId: commonSchemas.sanitizedString.max(100),
    photoIds: z.array(commonSchemas.sanitizedString.max(100)).max(10, 'Maximum 10 photos per request'),
    tags: z.array(commonSchemas.sanitizedString.max(50)).max(20, 'Maximum 20 tags'),
    notes: commonSchemas.sanitizedString.max(1000).optional(),
    location: z.object({
      latitude: z.number().min(-90).max(90),
      longitude: z.number().min(-180).max(180),
    }).optional(),
  })),
  async (request: NextRequest, { user, data }) => {
    // Process Company Cam photo data
    const photoData = {
      projectId: data.projectId,
      photoIds: data.photoIds,
      tags: [...data.tags, 'paintbox-app'], // Add app tag
      notes: data.notes,
      location: data.location,
      uploadedBy: user.sub,
      uploadedAt: new Date().toISOString(),
    };

    return NextResponse.json({
      success: true,
      data: photoData,
      message: `${data.photoIds.length} photos processed successfully`,
    });
  }
);

/**
 * Example 7: Custom Middleware Composition
 * File: app/api/v1/estimates/custom-workflow/route.ts
 */
const customEstimateWorkflow = composeMiddleware(
  // Custom rate limiting for this specific endpoint
  async (request: NextRequest) => {
    return await rateLimitMiddleware(request, {
      windowMs: 300000, // 5 minutes
      maxRequests: 3, // Only 3 requests per 5 minutes
      keyGenerator: (req) => `custom-estimate:${req.headers.get('x-forwarded-for')}`,
      message: 'Custom estimate workflow rate limit exceeded',
    });
  },

  // Authentication required
  authMiddleware,

  // Custom validation for this workflow
  createValidationMiddleware(z.object({
    workflowType: z.enum(['quick', 'detailed', 'premium']),
    clientPriority: z.enum(['low', 'medium', 'high', 'urgent']),
    estimateData: paintboxSchemas.estimateData,
    additionalServices: z.array(z.string()).max(10).optional(),
  }))
);

export const customWorkflowExample = withMiddleware(
  customEstimateWorkflow,
  async (request: NextRequest, { user, data }) => {
    // Custom business logic based on workflow type
    let processingTime = 0;
    let priorityMultiplier = 1;

    switch (data.workflowType) {
      case 'quick':
        processingTime = 300; // 5 minutes
        break;
      case 'detailed':
        processingTime = 1800; // 30 minutes
        break;
      case 'premium':
        processingTime = 3600; // 1 hour
        break;
    }

    switch (data.clientPriority) {
      case 'urgent':
        priorityMultiplier = 0.5;
        break;
      case 'high':
        priorityMultiplier = 0.75;
        break;
      case 'medium':
        priorityMultiplier = 1;
        break;
      case 'low':
        priorityMultiplier = 1.5;
        break;
    }

    const estimatedCompletion = new Date(
      Date.now() + (processingTime * priorityMultiplier * 1000)
    ).toISOString();

    return NextResponse.json({
      success: true,
      data: {
        workflowId: 'workflow_' + Date.now(),
        type: data.workflowType,
        priority: data.clientPriority,
        estimatedCompletion,
        processingTime: processingTime * priorityMultiplier,
        assignedTo: user.sub,
      },
      message: 'Custom workflow initiated successfully',
    });
  }
);

/**
 * Example 8: Login Endpoint with Special Rate Limiting
 * File: app/api/v1/auth/login/route.ts
 */
export const loginExample = withMiddleware(
  // Custom composition for login - stricter rate limiting but no auth required
  composeMiddleware(
    async (request: NextRequest) => {
      return await rateLimitMiddleware(request, {
        windowMs: 900000, // 15 minutes
        maxRequests: 5, // Only 5 login attempts per 15 minutes per IP
        keyGenerator: (req) => `login:${req.headers.get('x-forwarded-for')}`,
        message: 'Too many login attempts, please try again later',
        algorithm: 'fixed-window',
      });
    },
    createValidationMiddleware(paintboxSchemas.userLogin)
  ),
  async (request: NextRequest, { data }) => {
    // Simulate authentication logic
    const isValidCredentials = data.email === 'admin@paintbox.com' && data.password === 'securepassword';

    if (!isValidCredentials) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Generate JWT token (in real implementation)
    const token = 'jwt_token_here';

    const response = NextResponse.json({
      success: true,
      message: 'Login successful',
      user: {
        id: 'user_123',
        email: data.email,
        role: 'admin',
      },
    });

    // Set secure HTTP-only cookie
    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 3600, // 1 hour
    });

    return response;
  }
);

/**
 * Example 9: File Upload with Size and Type Validation
 * File: app/api/v1/uploads/documents/route.ts
 */
export const fileUploadExample = withMiddleware(
  protectedApiMiddleware(z.object({
    documentType: z.enum(['contract', 'invoice', 'photo', 'blueprint']),
    projectId: commonSchemas.uuid,
    description: commonSchemas.sanitizedString.max(500).optional(),
  })),
  async (request: NextRequest, { user, data }) => {
    // In real implementation, you would handle multipart/form-data
    // and validate file size, type, etc.

    const uploadedFile = {
      id: 'file_' + Date.now(),
      type: data.documentType,
      projectId: data.projectId,
      description: data.description,
      uploadedBy: user.sub,
      uploadedAt: new Date().toISOString(),
      size: 1024 * 1024, // 1MB example
      filename: 'document.pdf',
      url: `/uploads/${data.projectId}/document.pdf`,
    };

    return NextResponse.json({
      success: true,
      data: uploadedFile,
      message: 'File uploaded successfully',
    });
  }
);

// Export all examples for easy importing
export const examples = {
  publicEstimateCalculationExample,
  saveEstimateExample,
  userManagementExample,
  deleteUserExample,
  salesforceAccountExample,
  companyCamPhotoExample,
  customWorkflowExample,
  loginExample,
  fileUploadExample,
};
