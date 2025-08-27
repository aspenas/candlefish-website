import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Navigate } from 'react-router-dom';
import { ShieldCheckIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import { useLogin } from '../hooks/useApi';
import { useAuthStore } from '../store/authStore';
import { useNotificationStore } from '../store/notificationStore';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import clsx from 'clsx';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('admin@candlefish.ai');
  const [password, setPassword] = useState('admin123');
  const [showPassword, setShowPassword] = useState(false);
  
  const { isAuthenticated, setUser, setToken } = useAuthStore();
  const { addNotification } = useNotificationStore();
  
  const loginMutation = useLogin({
    onSuccess: (response) => {
      if (response.success && response.data) {
        setToken(response.data.token);
        setUser(response.data.user);
        addNotification({
          type: 'success',
          title: 'Login Successful',
          message: 'Welcome to the Security Dashboard',
        });
      }
    },
    onError: (error) => {
      addNotification({
        type: 'error',
        title: 'Login Failed',
        message: error.message || 'Invalid credentials',
      });
    },
  });

  // If already authenticated, redirect to dashboard
  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      addNotification({
        type: 'error',
        title: 'Validation Error',
        message: 'Please enter both email and password',
      });
      return;
    }

    await loginMutation.mutateAsync({ email, password });
  };

  return (
    <>
      <Helmet>
        <title>Login - Candlefish Security Dashboard</title>
        <meta name="description" content="Secure login to the Candlefish Security Dashboard" />
      </Helmet>
      
      <div className="min-h-screen bg-soc-background flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          {/* Logo and Header */}
          <div className="text-center">
            <div className="mx-auto h-16 w-16 bg-security-600 rounded-full flex items-center justify-center">
              <ShieldCheckIcon className="h-10 w-10 text-white" />
            </div>
            <h2 className="mt-6 text-3xl font-bold text-white">
              Security Dashboard
            </h2>
            <p className="mt-2 text-sm text-soc-muted">
              Sign in to your account to access the security operations center
            </p>
          </div>

          {/* Login Form */}
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-4">
              {/* Email Field */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-white">
                  Email Address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="soc-input mt-1"
                  placeholder="Enter your email address"
                />
              </div>

              {/* Password Field */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-white">
                  Password
                </label>
                <div className="relative mt-1">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="soc-input pr-10"
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-soc-muted hover:text-white"
                  >
                    {showPassword ? (
                      <EyeSlashIcon className="h-5 w-5" />
                    ) : (
                      <EyeIcon className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Remember Me and Forgot Password */}
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-security-600 bg-soc-elevated border-soc-border rounded focus:ring-security-500 focus:ring-offset-0"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-soc-muted">
                  Remember me
                </label>
              </div>

              <div className="text-sm">
                <a href="#" className="font-medium text-security-400 hover:text-security-300">
                  Forgot your password?
                </a>
              </div>
            </div>

            {/* Submit Button */}
            <div>
              <button
                type="submit"
                disabled={loginMutation.isPending}
                className={clsx(
                  'soc-button-primary w-full flex justify-center items-center space-x-2 py-3',
                  loginMutation.isPending && 'opacity-75 cursor-not-allowed'
                )}
              >
                {loginMutation.isPending ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  <>
                    <ShieldCheckIcon className="w-5 h-5" />
                    <span>Sign In</span>
                  </>
                )}
              </button>
            </div>

            {/* Demo Credentials */}
            <div className="mt-6 p-4 bg-info-950/20 border border-info-800/30 rounded-lg">
              <h3 className="text-sm font-medium text-info-400 mb-2">Demo Credentials</h3>
              <div className="text-sm text-soc-muted space-y-1">
                <div>Email: admin@candlefish.ai</div>
                <div>Password: admin123</div>
              </div>
            </div>
          </form>

          {/* Additional Info */}
          <div className="mt-6 text-center">
            <p className="text-xs text-soc-muted">
              Secure authentication using JWT RS256 tokens
            </p>
            <div className="flex items-center justify-center space-x-1 mt-2">
              <div className="w-2 h-2 bg-success-500 rounded-full"></div>
              <span className="text-xs text-success-400">System Status: Operational</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default LoginPage;