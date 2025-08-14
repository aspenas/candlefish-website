import React from 'react'
import { ApolloProvider } from '@apollo/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { apolloClient } from '@/graphql/client'
import { CustomerDashboard } from '@/components/dashboard/CustomerDashboard'
import { ProjectGallery } from '@/components/gallery/ProjectGallery'
import { IntegrationMonitor } from '@/components/monitor/IntegrationMonitor'
import { Layout } from '@/components/layout/Layout'
import '@/styles/globals.css'

function App() {
  return (
    <ApolloProvider client={apolloClient}>
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<Navigate to="/customers" replace />} />
            <Route path="/customers" element={<CustomerDashboard />} />
            <Route path="/projects" element={<ProjectGallery />} />
            <Route path="/projects/:customerId" element={<ProjectGallery />} />
            <Route path="/integrations" element={<IntegrationMonitor />} />
            <Route path="*" element={<Navigate to="/customers" replace />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </ApolloProvider>
  )
}

export default App
