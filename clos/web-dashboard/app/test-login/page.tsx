'use client';

import { useState } from 'react';

export default function TestLoginPage() {
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);

  const handleTestLogin = async () => {
    setLoading(true);
    setResult('Testing login...');
    
    try {
      console.log('Starting login test...');
      
      const response = await fetch('http://localhost:3501/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: 'patrick',
          password: 'admin_password'
        }),
      });

      console.log('Response status:', response.status);
      const data = await response.json();
      console.log('Response data:', data);

      if (data.success) {
        localStorage.setItem('accessToken', data.data.accessToken);
        localStorage.setItem('refreshToken', data.data.refreshToken);
        setResult('✅ Login successful! Token stored. Redirecting...');
        
        setTimeout(() => {
          window.location.href = '/';
        }, 1000);
      } else {
        setResult(`❌ Login failed: ${data.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Login error:', error);
      setResult(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-slate-800 p-8 rounded-lg max-w-md w-full">
        <h1 className="text-2xl font-bold text-white mb-6">Test Login Page</h1>
        
        <button
          onClick={handleTestLogin}
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded disabled:opacity-50"
        >
          {loading ? 'Testing...' : 'Test Login as Patrick (Admin)'}
        </button>
        
        {result && (
          <div className="mt-4 p-4 bg-slate-700 rounded text-white">
            <pre className="whitespace-pre-wrap">{result}</pre>
          </div>
        )}
        
        <div className="mt-6 text-sm text-slate-400">
          <p>This will test:</p>
          <ul className="list-disc list-inside mt-2">
            <li>API connection to localhost:3501</li>
            <li>Login with patrick/admin_password</li>
            <li>Token storage in localStorage</li>
            <li>Redirect to dashboard</li>
          </ul>
        </div>
      </div>
    </div>
  );
}