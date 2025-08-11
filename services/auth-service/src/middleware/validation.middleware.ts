import { Request, Response, NextFunction } from 'express';
import { validationResult, ValidationChain } from 'express-validator';
import { ApiResponse } from '../types';
import { logger } from '../utils/logger';

const moduleLogger = logger.child({ module: 'ValidationMiddleware' });

/**
 * Handle validation errors from express-validator
 */
export const handleValidationErrors = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const errorDetails = errors.array().map(error => ({
      field: error.type === 'field' ? (error as any).path : 'unknown',
      message: error.msg,
      value: error.type === 'field' ? (error as any).value : undefined,
    }));

    moduleLogger.warn('Validation errors:', {
      url: req.url,
      method: req.method,
      errors: errorDetails,
    });

    const response: ApiResponse = {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid input data',
        details: errorDetails,
      },
      meta: {
        timestamp: new Date().toISOString(),
        version: 'v1',
      },
    };

    res.status(400).json(response);
    return;
  }

  next();
};

/**
 * Combine validation chains with error handling
 */
export const validate = (validations: ValidationChain[]) => {
  return [...validations, handleValidationErrors];
};

/**
 * Sanitize input data by removing extra fields
 */
export const sanitizeInput = (allowedFields: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (req.body && typeof req.body === 'object') {
      const sanitized: Record<string, any> = {};

      for (const field of allowedFields) {
        if (field in req.body) {
          sanitized[field] = req.body[field];
        }
      }

      req.body = sanitized;
    }

    next();
  };
};

/**
 * Validate Content-Type header
 */
export const validateContentType = (allowedTypes: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const contentType = req.get('Content-Type');

    if (!contentType || !allowedTypes.some(type => contentType.includes(type))) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'INVALID_CONTENT_TYPE',
          message: `Content-Type must be one of: ${allowedTypes.join(', ')}`,
        },
        meta: {
          timestamp: new Date().toISOString(),
          version: 'v1',
        },
      };

      res.status(415).json(response);
      return;
    }

    next();
  };
};

/**
 * Validate request size
 */
export const validateRequestSize = (maxSizeBytes: number) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const contentLength = req.get('Content-Length');

    if (contentLength && parseInt(contentLength) > maxSizeBytes) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'REQUEST_TOO_LARGE',
          message: `Request size exceeds ${maxSizeBytes} bytes`,
        },
        meta: {
          timestamp: new Date().toISOString(),
          version: 'v1',
        },
      };

      res.status(413).json(response);
      return;
    }

    next();
  };
};

/**
 * Trim string values in request body
 */
export const trimStrings = (req: Request, res: Response, next: NextFunction): void => {
  if (req.body && typeof req.body === 'object') {
    const trimObject = (obj: any): any => {
      if (typeof obj === 'string') {
        return obj.trim();
      }

      if (Array.isArray(obj)) {
        return obj.map(trimObject);
      }

      if (obj && typeof obj === 'object') {
        const trimmed: Record<string, any> = {};
        for (const [key, value] of Object.entries(obj)) {
          trimmed[key] = trimObject(value);
        }
        return trimmed;
      }

      return obj;
    };

    req.body = trimObject(req.body);
  }

  next();
};

/**
 * Convert email to lowercase
 */
export const normalizeEmail = (req: Request, res: Response, next: NextFunction): void => {
  if (req.body?.email && typeof req.body.email === 'string') {
    req.body.email = req.body.email.toLowerCase().trim();
  }

  next();
};

/**
 * Remove null and undefined values
 */
export const removeNullish = (req: Request, res: Response, next: NextFunction): void => {
  if (req.body && typeof req.body === 'object') {
    const cleanObject = (obj: any): any => {
      if (obj === null || obj === undefined) {
        return undefined;
      }

      if (Array.isArray(obj)) {
        return obj.map(cleanObject).filter(item => item !== undefined);
      }

      if (typeof obj === 'object') {
        const cleaned: Record<string, any> = {};
        for (const [key, value] of Object.entries(obj)) {
          const cleanedValue = cleanObject(value);
          if (cleanedValue !== undefined) {
            cleaned[key] = cleanedValue;
          }
        }
        return cleaned;
      }

      return obj;
    };

    req.body = cleanObject(req.body);
  }

  next();
};

/**
 * Validate pagination parameters
 */
export const validatePagination = (req: Request, res: Response, next: NextFunction): void => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;

  if (page < 1) {
    const response: ApiResponse = {
      success: false,
      error: {
        code: 'INVALID_PAGE',
        message: 'Page must be greater than 0',
      },
      meta: {
        timestamp: new Date().toISOString(),
        version: 'v1',
      },
    };

    res.status(400).json(response);
    return;
  }

  if (limit < 1 || limit > 100) {
    const response: ApiResponse = {
      success: false,
      error: {
        code: 'INVALID_LIMIT',
        message: 'Limit must be between 1 and 100',
      },
      meta: {
        timestamp: new Date().toISOString(),
        version: 'v1',
      },
    };

    res.status(400).json(response);
    return;
  }

  // Attach validated pagination to request
  (req as any).pagination = { page, limit, offset: (page - 1) * limit };
  next();
};
