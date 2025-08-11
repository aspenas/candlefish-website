import { Router } from 'express';
import {
  healthCheck,
  detailedHealthCheck,
  readinessCheck,
  livenessCheck,
} from '../controllers/health.controller';

const router = Router();

/**
 * @route   GET /health
 * @desc    Basic health check
 * @access  Public
 */
router.get('/', healthCheck);

/**
 * @route   GET /health/detailed
 * @desc    Detailed health check with dependencies
 * @access  Public
 */
router.get('/detailed', detailedHealthCheck);

/**
 * @route   GET /health/ready
 * @desc    Readiness probe for Kubernetes/Docker
 * @access  Public
 */
router.get('/ready', readinessCheck);

/**
 * @route   GET /health/live
 * @desc    Liveness probe for Kubernetes/Docker
 * @access  Public
 */
router.get('/live', livenessCheck);

export default router;
