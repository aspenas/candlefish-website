/**
 * Authentication Routes
 * Handles login, logout, token refresh, and user management
 */

import { Router, Request, Response } from 'express';
import { AuthService } from './auth.service';
import { AuthMiddleware } from './auth.middleware';
import { Pool } from 'pg';
import { Redis } from 'ioredis';
import { body, validationResult } from 'express-validator';

export function createAuthRoutes(db: Pool, redis: Redis): Router {
  const router = Router();
  const authService = new AuthService(db, redis);
  const authMiddleware = new AuthMiddleware(db, redis);

  /**
   * Login with username/password
   */
  router.post('/login',
    [
      body('username').notEmpty().withMessage('Username is required'),
      body('password').notEmpty().withMessage('Password is required')
    ],
    async (req: Request, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }

      try {
        const { username, password } = req.body;
        const tokens = await authService.authenticateUser(username, password);
        
        // Set httpOnly cookies for security
        res.cookie('accessToken', tokens.accessToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: 15 * 60 * 1000 // 15 minutes
        });
        
        res.cookie('refreshToken', tokens.refreshToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });
        
        res.json({
          success: true,
          data: tokens
        });
      } catch (error: any) {
        res.status(401).json({
          success: false,
          message: error.message
        });
      }
    }
  );

  /**
   * Refresh access token
   */
  router.post('/refresh',
    [
      body('refreshToken').notEmpty().withMessage('Refresh token is required')
    ],
    async (req: Request, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }

      try {
        const { refreshToken } = req.body;
        const tokens = await authService.refreshToken(refreshToken);
        
        res.json({
          success: true,
          data: tokens
        });
      } catch (error) {
        res.status(401).json({
          success: false,
          message: error instanceof Error ? error.message : 'Authentication failed'
        });
      }
    }
  );

  /**
   * Logout
   */
  router.post('/logout',
    authMiddleware.authenticate,
    async (req: Request, res: Response) => {
      try {
        const token = req.headers.authorization?.substring(7) || req.cookies?.accessToken || '';
        await authService.logout(req.user!.userId, token);
        
        // Clear cookies
        res.clearCookie('accessToken');
        res.clearCookie('refreshToken');
        
        res.json({
          success: true,
          message: 'Logged out successfully'
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          message: error instanceof Error ? error.message : 'Internal server error'
        });
      }
    }
  );

  /**
   * Get current user
   */
  router.get('/me',
    authMiddleware.authenticate,
    async (req: Request, res: Response) => {
      try {
        const result = await db.query(
          'SELECT id, username, email, role, created_at, last_login FROM users WHERE id = $1',
          [req.user!.userId]
        );

        if (result.rows.length === 0) {
          return res.status(404).json({
            success: false,
            message: 'User not found'
          });
        }

        res.json({
          success: true,
          data: result.rows[0]
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          message: error instanceof Error ? error.message : 'Internal server error'
        });
      }
    }
  );

  /**
   * Change password
   */
  router.post('/change-password',
    authMiddleware.authenticate,
    [
      body('oldPassword').notEmpty().withMessage('Current password is required'),
      body('newPassword')
        .isLength({ min: 8 })
        .withMessage('Password must be at least 8 characters')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .withMessage('Password must contain uppercase, lowercase, and number')
    ],
    async (req: Request, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }

      try {
        const { oldPassword, newPassword } = req.body;
        await authService.changePassword(req.user!.userId, oldPassword, newPassword);
        
        res.json({
          success: true,
          message: 'Password changed successfully'
        });
      } catch (error) {
        res.status(400).json({
          success: false,
          message: error instanceof Error ? error.message : 'Bad request'
        });
      }
    }
  );

  /**
   * Create API key
   */
  router.post('/api-keys',
    authMiddleware.authenticate,
    [
      body('name').notEmpty().withMessage('API key name is required'),
      body('permissions').isArray().withMessage('Permissions must be an array')
    ],
    async (req: Request, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }

      try {
        const { name, permissions } = req.body;
        const apiKey = await authService.createApiKey(
          req.user!.userId,
          name,
          permissions || []
        );
        
        res.json({
          success: true,
          data: apiKey,
          message: 'Save this API key securely. It will not be shown again.'
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          message: error instanceof Error ? error.message : 'Internal server error'
        });
      }
    }
  );

  /**
   * List API keys
   */
  router.get('/api-keys',
    authMiddleware.authenticate,
    async (req: Request, res: Response) => {
      try {
        const result = await db.query(
          `SELECT id, name, permissions, last_used, created_at, is_active 
           FROM api_keys 
           WHERE user_id = $1 
           ORDER BY created_at DESC`,
          [req.user!.userId]
        );

        res.json({
          success: true,
          data: result.rows
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          message: error instanceof Error ? error.message : 'Internal server error'
        });
      }
    }
  );

  /**
   * Revoke API key
   */
  router.delete('/api-keys/:id',
    authMiddleware.authenticate,
    async (req: Request, res: Response) => {
      try {
        await authService.revokeApiKey(req.params.id, req.user!.userId);
        
        res.json({
          success: true,
          message: 'API key revoked successfully'
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          message: error instanceof Error ? error.message : 'Internal server error'
        });
      }
    }
  );

  /**
   * Admin: Create user
   */
  router.post('/users',
    authMiddleware.authenticate,
    authMiddleware.requireAdmin,
    [
      body('username').notEmpty().withMessage('Username is required'),
      body('email').isEmail().withMessage('Valid email is required'),
      body('password')
        .isLength({ min: 8 })
        .withMessage('Password must be at least 8 characters'),
      body('role').isIn(['admin', 'user', 'viewer']).withMessage('Invalid role')
    ],
    async (req: Request, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }

      try {
        const { username, email, password, role } = req.body;
        const user = await authService.createUser(username, email, password, role);
        
        res.json({
          success: true,
          data: user
        });
      } catch (error) {
        res.status(400).json({
          success: false,
          message: error instanceof Error ? error.message : 'Bad request'
        });
      }
    }
  );

  /**
   * Admin: List users
   */
  router.get('/users',
    authMiddleware.authenticate,
    authMiddleware.requireAdmin,
    async (req: Request, res: Response) => {
      try {
        const result = await db.query(
          `SELECT id, username, email, role, is_active, last_login, created_at 
           FROM users 
           ORDER BY created_at DESC`
        );

        res.json({
          success: true,
          data: result.rows
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          message: error instanceof Error ? error.message : 'Internal server error'
        });
      }
    }
  );

  /**
   * Admin: Update user
   */
  router.patch('/users/:id',
    authMiddleware.authenticate,
    authMiddleware.requireAdmin,
    async (req: Request, res: Response) => {
      try {
        const { role, is_active } = req.body;
        const updates = [];
        const values = [];
        let paramCount = 1;

        if (role !== undefined) {
          updates.push(`role = $${paramCount++}`);
          values.push(role);
        }

        if (is_active !== undefined) {
          updates.push(`is_active = $${paramCount++}`);
          values.push(is_active);
        }

        if (updates.length === 0) {
          return res.status(400).json({
            success: false,
            message: 'No updates provided'
          });
        }

        values.push(req.params.id);
        
        await db.query(
          `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramCount}`,
          values
        );

        res.json({
          success: true,
          message: 'User updated successfully'
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          message: error instanceof Error ? error.message : 'Internal server error'
        });
      }
    }
  );

  /**
   * Admin: Delete user
   */
  router.delete('/users/:id',
    authMiddleware.authenticate,
    authMiddleware.requireAdmin,
    async (req: Request, res: Response) => {
      try {
        // Prevent self-deletion
        if (req.params.id === req.user!.userId) {
          return res.status(400).json({
            success: false,
            message: 'Cannot delete your own account'
          });
        }

        await db.query('DELETE FROM users WHERE id = $1', [req.params.id]);

        res.json({
          success: true,
          message: 'User deleted successfully'
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          message: error instanceof Error ? error.message : 'Internal server error'
        });
      }
    }
  );

  return router;
}