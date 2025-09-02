'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Lock, User, AlertCircle, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (data.success) {
        // Store tokens
        localStorage.setItem('accessToken', data.data.accessToken);
        localStorage.setItem('refreshToken', data.data.refreshToken);
        
        console.log('Login successful, redirecting to dashboard...');
        
        // Try router.push first, then fallback to window.location
        router.push('/');
        
        // Fallback redirect after a short delay
        setTimeout(() => {
          window.location.href = '/';
        }, 100);
      } else {
        setError(data.message || 'Login failed');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('Failed to connect to server: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-4">
            <Lock className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">CLOS Dashboard</h1>
          <p className="text-slate-400 mt-2">Sign in to manage your services</p>
        </div>

        {/* Login Form */}
        <div className="bg-slate-800 rounded-2xl shadow-xl p-8">
          <form onSubmit={handleLogin} className="space-y-6">
            {/* Error Message */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            {/* Username Field */}
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-slate-300 mb-2">
                Username or Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-slate-500" />
                </div>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  placeholder="Enter your username"
                  required
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-2">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-500" />
                </div>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-10 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  placeholder="Enter your password"
                  required
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  disabled={isLoading}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-slate-500 hover:text-slate-400" />
                  ) : (
                    <Eye className="h-5 w-5 text-slate-500 hover:text-slate-400" />
                  )}
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember"
                  type="checkbox"
                  className="h-4 w-4 bg-slate-900 border-slate-700 rounded text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="remember" className="ml-2 block text-sm text-slate-400">
                  Remember me
                </label>
              </div>
              <a href="#" className="text-sm text-blue-500 hover:text-blue-400">
                Forgot password?
              </a>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {/* Quick Login Options */}
          <div className="mt-6 pt-6 border-t border-slate-700">
            <p className="text-xs text-slate-500 text-center mb-4">Quick login for testing:</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={async () => {
                  // Directly perform login for Patrick
                  console.log('Quick login for Patrick started');
                  setError('');
                  setIsLoading(true);
                  try {
                    const response = await fetch('/api/auth/login', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      credentials: 'include',
                      body: JSON.stringify({ username: 'patrick', password: 'admin_password' }),
                    });
                    console.log('Response status:', response.status);
                    const data = await response.json();
                    console.log('Response data:', data);
                    if (data.success) {
                      localStorage.setItem('accessToken', data.data.accessToken);
                      localStorage.setItem('refreshToken', data.data.refreshToken);
                      console.log('Quick login successful, redirecting...');
                      router.push('/');
                      setTimeout(() => {
                        window.location.href = '/';
                      }, 100);
                    } else {
                      setError(data.message || 'Login failed');
                    }
                  } catch (err) {
                    console.error('Quick login error:', err);
                    setError('Failed to connect to server: ' + (err instanceof Error ? err.message : 'Unknown error'));
                  } finally {
                    setIsLoading(false);
                  }
                }}
                className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-xs text-slate-300 rounded transition-colors"
              >
                Admin (Patrick)
              </button>
              <button
                type="button"
                onClick={async () => {
                  // Directly perform login for Tyler
                  setError('');
                  setIsLoading(true);
                  try {
                    const response = await fetch('/api/auth/login', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      credentials: 'include',
                      body: JSON.stringify({ username: 'tyler', password: 'user_password' }),
                    });
                    const data = await response.json();
                    if (data.success) {
                      localStorage.setItem('accessToken', data.data.accessToken);
                      localStorage.setItem('refreshToken', data.data.refreshToken);
                      console.log('Quick login successful, redirecting...');
                      router.push('/');
                      setTimeout(() => {
                        window.location.href = '/';
                      }, 100);
                    } else {
                      setError(data.message || 'Login failed');
                    }
                  } catch (err) {
                    console.error('Quick login error:', err);
                    setError('Failed to connect to server: ' + (err instanceof Error ? err.message : 'Unknown error'));
                  } finally {
                    setIsLoading(false);
                  }
                }}
                className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-xs text-slate-300 rounded transition-colors"
              >
                User (Tyler)
              </button>
              <button
                type="button"
                onClick={async () => {
                  // Directly perform login for Aaron
                  setError('');
                  setIsLoading(true);
                  try {
                    const response = await fetch('/api/auth/login', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      credentials: 'include',
                      body: JSON.stringify({ username: 'aaron', password: 'user_password' }),
                    });
                    const data = await response.json();
                    if (data.success) {
                      localStorage.setItem('accessToken', data.data.accessToken);
                      localStorage.setItem('refreshToken', data.data.refreshToken);
                      console.log('Quick login successful, redirecting...');
                      router.push('/');
                      setTimeout(() => {
                        window.location.href = '/';
                      }, 100);
                    } else {
                      setError(data.message || 'Login failed');
                    }
                  } catch (err) {
                    console.error('Quick login error:', err);
                    setError('Failed to connect to server: ' + (err instanceof Error ? err.message : 'Unknown error'));
                  } finally {
                    setIsLoading(false);
                  }
                }}
                className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-xs text-slate-300 rounded transition-colors"
              >
                User (Aaron)
              </button>
              <button
                type="button"
                onClick={async () => {
                  // Directly perform login for James
                  setError('');
                  setIsLoading(true);
                  try {
                    const response = await fetch('/api/auth/login', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      credentials: 'include',
                      body: JSON.stringify({ username: 'james', password: 'user_password' }),
                    });
                    const data = await response.json();
                    if (data.success) {
                      localStorage.setItem('accessToken', data.data.accessToken);
                      localStorage.setItem('refreshToken', data.data.refreshToken);
                      console.log('Quick login successful, redirecting...');
                      router.push('/');
                      setTimeout(() => {
                        window.location.href = '/';
                      }, 100);
                    } else {
                      setError(data.message || 'Login failed');
                    }
                  } catch (err) {
                    console.error('Quick login error:', err);
                    setError('Failed to connect to server: ' + (err instanceof Error ? err.message : 'Unknown error'));
                  } finally {
                    setIsLoading(false);
                  }
                }}
                className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-xs text-slate-300 rounded transition-colors"
              >
                User (James)
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-slate-500 mt-6">
          CLOS Dashboard v2.0 with NANDA Agents
        </p>
      </div>
    </div>
  );
}