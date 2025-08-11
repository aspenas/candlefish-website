import { Router } from 'express';
import authRoutes from './auth.routes';
import healthRoutes from './health.routes';
import { ApiResponse } from '../types';
import { config } from '../config';

const router = Router();

// API info endpoint
router.get('/', (req, res) => {
  const response: ApiResponse<{
    name: string;
    version: string;
    description: string;
    environment: string;
    timestamp: string;
    endpoints: string[];
  }> = {
    success: true,
    data: {
      name: 'Candlefish Authentication Service',
      version: '1.0.0',
      description: 'Production-ready authentication service for Candlefish AI platform',
      environment: process.env.NODE_ENV || 'unknown',
      timestamp: new Date().toISOString(),
      endpoints: [
        'GET /api/v1/',
        'POST /api/v1/auth/register',
        'POST /api/v1/auth/login',
        'POST /api/v1/auth/refresh',
        'POST /api/v1/auth/logout',
        'GET /api/v1/auth/profile',
        'POST /api/v1/auth/verify',
        'GET /api/v1/health',
        'GET /api/v1/health/detailed',
        'GET /api/v1/health/ready',
        'GET /api/v1/health/live',
      ],
    },
    meta: {
      timestamp: new Date().toISOString(),
      version: config.server.apiVersion,
    },
  };

  res.json(response);
});

// Mount route modules
router.use('/auth', authRoutes);
router.use('/health', healthRoutes);

export default router;
