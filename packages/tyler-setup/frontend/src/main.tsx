import React from 'react';
import ReactDOM from 'react-dom/client';
import { ApolloProvider } from '@apollo/client';
import { BrowserRouter } from 'react-router-dom';
import { apolloClient } from '@/lib/apollo';
import { Toaster } from '@/components/ui/toaster';
import { ThemeProvider } from '@/components/theme-provider';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ApolloProvider client={apolloClient}>
      <BrowserRouter>
        <ThemeProvider defaultTheme="system" storageKey="tyler-setup-ui-theme">
          <App />
          <Toaster />
        </ThemeProvider>
      </BrowserRouter>
    </ApolloProvider>
  </React.StrictMode>
);
