'use client';

import { useState } from 'react';

export default function SimpleLogin() {
  const [email, setEmail] = useState('admin@paintbox.com');
  const [password, setPassword] = useState('admin123');
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [userData, setUserData] = useState<any>(null);

  const GRAPHQL_URL = 'https://paintbox-graphql.fly.dev/graphql';

  const handleLogin = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch(GRAPHQL_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: `
            mutation Login($email: String!, $password: String!) {
              login(email: $email, password: $password) {
                token
                user {
                  id
                  email
                  name
                  role
                }
              }
            }
          `,
          variables: { email, password }
        })
      });

      const data = await response.json();

      if (data.errors) {
        setError(data.errors[0].message);
      } else if (data.data && data.data.login) {
        setToken(data.data.login.token);
        setUserData(data.data.login.user);
        localStorage.setItem('authToken', data.data.login.token);
      }
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const testAuthenticatedQuery = async () => {
    if (!token) return;

    setLoading(true);
    try {
      const response = await fetch(GRAPHQL_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          query: `
            query {
              me {
                id
                email
                name
                role
              }
              projects(filter: "") {
                edges {
                  node {
                    id
                    name
                    client
                    status
                  }
                }
              }
            }
          `
        })
      });

      const data = await response.json();
      console.log('Authenticated query result:', data);
      alert('Check console for query results!');
    } catch (err: any) {
      setError(err.message || 'Query failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '400px', margin: '50px auto', padding: '20px', fontFamily: 'system-ui' }}>
      <h1>Paintbox Simple Login</h1>

      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '5px' }}>Email:</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ width: '100%', padding: '8px', marginBottom: '10px' }}
        />

        <label style={{ display: 'block', marginBottom: '5px' }}>Password:</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ width: '100%', padding: '8px', marginBottom: '10px' }}
        />

        <button
          onClick={handleLogin}
          disabled={loading}
          style={{
            width: '100%',
            padding: '10px',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? 'Loading...' : 'Login'}
        </button>
      </div>

      {error && (
        <div style={{ color: 'red', marginBottom: '10px' }}>
          Error: {error}
        </div>
      )}

      {userData && (
        <div style={{ backgroundColor: '#f0f9ff', padding: '10px', borderRadius: '4px' }}>
          <h3>Logged in successfully!</h3>
          <p><strong>User:</strong> {userData.name}</p>
          <p><strong>Email:</strong> {userData.email}</p>
          <p><strong>Role:</strong> {userData.role}</p>
          <p><strong>Token:</strong> {token.substring(0, 20)}...</p>

          <button
            onClick={testAuthenticatedQuery}
            style={{
              marginTop: '10px',
              padding: '8px 16px',
              backgroundColor: '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Test Authenticated Query
          </button>
        </div>
      )}

      <div style={{ marginTop: '20px', fontSize: '12px', color: '#666' }}>
        <p>GraphQL API: {GRAPHQL_URL}</p>
        <p>Default credentials: admin@paintbox.com / admin123</p>
      </div>
    </div>
  );
}
